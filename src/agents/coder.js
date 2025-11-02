/**
 * Coder Agent
 * Specialized for writing code files
 */

import { BaseAgent } from './base-agent.js';

const CODER_PROMPT = `You are a CODER agent. Your ONLY job is to write actual code files using the Write and Edit tools.

## YOUR ROLE:
You are the third agent in a pipeline. You receive a checklist from the Planner and must execute it by creating files.

## AVAILABLE TOOLS:
- Write: Create new files or overwrite existing ones (PRIMARY TOOL FOR NEW FILES)
- Edit: Modify existing files by replacing text
- Read: Read files if you need to reference existing code
- Glob: Find files by pattern (e.g., find where to put test files, find similar examples)
- Grep: Search for patterns in code (e.g., find imports, fixtures, class names)
- TodoWrite: Update the checklist as you complete items

## FORBIDDEN TOOLS:
⚠️ You are FORBIDDEN from using Bash to run commands. Your job is WRITING code, not EXECUTING it.

## YOUR TASK:
1. **Review the checklist** provided by the Planner
2. **Work through EVERY item** in order
3. **Use Write tool to CREATE files** with complete, working code
4. **Use Edit tool to MODIFY files** when needed
5. **Mark todos as completed** as you finish them

## CODE REQUIREMENTS:
- Generate COMPLETE, working code (not TODO comments or placeholders)
- Follow the project's existing conventions
- Include proper imports, class definitions, function signatures
- Add docstrings and comments where appropriate
- Make code production-ready

## OUTPUT FORMAT:
For each file you create, announce it clearly:

### Created: path/to/file.py
\`\`\`python
[full file contents]
\`\`\`

Then use the Write tool to actually create it.

## CRITICAL RULES:
1. YOU MUST USE Write or Edit tools - explanations are useless
2. Generate COMPLETE code, not snippets or examples
3. Work through EVERY item in the checklist
4. Update TodoWrite to mark items complete as you finish
5. DO NOT stop until ALL checklist items are done

## EXAMPLE WORKFLOW:
Checklist:
1. ○ Read existing WebSocket implementation
2. ○ Create tests/test_websocket_advanced.py with 3 test cases
3. ○ Verify tests follow project conventions

You should:
1. Use Read to examine WebSocket implementation
2. Use Write to create complete test file with ALL 3 test cases
3. Mark todos as completed using TodoWrite
4. Verify the code follows conventions

## WHAT SUCCESS LOOKS LIKE:
✅ Every checklist item is completed
✅ All requested files are created with Write tool
✅ Files contain complete, working code
✅ Code follows project conventions
✅ TodoWrite shows all items as completed

## WHAT FAILURE LOOKS LIKE:
❌ Explaining what code should look like without writing it
❌ Creating partial/incomplete files
❌ Stopping before finishing the checklist
❌ Writing TODO comments instead of real code
❌ Not using Write/Edit tools

Remember: You are the DOER, not the EXPLAINER. Code speaks louder than words!

⚠️ MANDATORY: You MUST use Write or Edit tool at least once. If you don't create files, you fail.`;

export class CoderAgent extends BaseAgent {
  constructor() {
    super(
      'Coder',
      CODER_PROMPT,
      ['Write', 'Edit', 'Read', 'Glob', 'Grep', 'TodoWrite']
    );
  }

  /**
   * Validate Coder output - MUST have created files
   */
  async validate(result, context) {
    // Check if Write or Edit was used
    const writeCall = result.tool_calls.find(call => call.tool === 'Write');
    const editCall = result.tool_calls.find(call => call.tool === 'Edit');

    if (!writeCall && !editCall) {
      return {
        success: false,
        message: 'Coder MUST use Write or Edit tool to create/modify files. No file operations detected.'
      };
    }

    // Extract files created/modified
    const filesCreated = this.extractFilesCreated(result);

    if (filesCreated.length === 0) {
      return {
        success: false,
        message: 'Write/Edit tools were called but no valid files were created.'
      };
    }

    // Check if code looks complete (not just TODO comments)
    const hasRealCode = this.validateCodeQuality(result);

    if (!hasRealCode) {
      return {
        success: false,
        message: 'Files were created but appear to contain placeholders or TODO comments instead of working code.'
      };
    }

    // NEW: Validate syntax of generated code files
    const syntaxCheck = await this.validateSyntax(filesCreated);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        message: `Generated code has syntax errors: ${syntaxCheck.errors.join(', ')}`
      };
    }

    return {
      success: true,
      message: `Created/modified ${filesCreated.length} file(s) with working code`,
      data: {
        files_created: filesCreated,
        raw_output: result.output
      }
    };
  }

  /**
   * Extract list of files that were created or modified
   */
  extractFilesCreated(result) {
    const files = [];

    result.tool_calls.forEach(call => {
      if (call.tool === 'Write' || call.tool === 'Edit') {
        // Try to extract file path from result
        const resultText = call.result.text || '';
        const pathMatch = resultText.match(/[Ff]ile\s+(?:written|created|updated|modified).*?:\s*([^\s\n]+)/);

        if (pathMatch) {
          files.push({
            path: pathMatch[1],
            operation: call.tool.toLowerCase(),
            success: resultText.toLowerCase().includes('success')
          });
        }
      }
    });

    return files;
  }

  /**
   * Validate syntax of generated files
   */
  async validateSyntax(filesCreated) {
    const { readFileSync } = await import('fs');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const errors = [];

    for (const file of filesCreated) {
      try {
        // Read the file content
        const content = readFileSync(file.path, 'utf-8');

        // Post-process: Fix escaped quotes in strings (common LLM error)
        const fixedContent = this.fixEscapedQuotes(content);

        // If content was fixed, rewrite the file
        if (fixedContent !== content) {
          const { writeFileSync } = await import('fs');
          writeFileSync(file.path, fixedContent, 'utf-8');
          console.log(`  ⚠️  Fixed escaped quotes in ${file.path}`);
        }

        // Validate syntax based on file type
        if (file.path.endsWith('.py')) {
          // Validate Python syntax
          try {
            await execAsync(`python3 -m py_compile "${file.path}"`, { timeout: 5000 });
          } catch (error) {
            errors.push(`${file.path}: ${error.message}`);
          }
        } else if (file.path.endsWith('.js') || file.path.endsWith('.mjs') || file.path.endsWith('.ts')) {
          // Validate JavaScript/TypeScript syntax
          try {
            await import(file.path);
          } catch (error) {
            // Only report syntax errors, not runtime errors
            if (error.message.includes('SyntaxError') || error.message.includes('Unexpected')) {
              errors.push(`${file.path}: ${error.message}`);
            }
          }
        }
        // For other file types, skip validation for now

      } catch (error) {
        errors.push(`${file.path}: Could not read file - ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Fix common LLM error: escaped quotes in strings
   */
  fixEscapedQuotes(content) {
    // Fix patterns like: assert x == "test", \"Message here\"
    // Should be: assert x == "test", "Message here"

    // This regex looks for \" preceded by a comma and space (common in assertions)
    // and replaces it with just "
    let fixed = content.replace(/,\s+\\"([^"]+)\\"/g, ', "$1"');

    // Also fix standalone \" that aren't part of actual escape sequences
    // Be careful not to break legitimate escapes like \\n
    fixed = fixed.replace(/([^\\])\\"([^"\\]+)\\"/g, '$1"$2"');

    return fixed;
  }

  /**
   * Validate that code looks real, not placeholders
   */
  validateCodeQuality(result) {
    const output = result.output.toLowerCase();

    // Bad signs (TODO comments, placeholders)
    const badPatterns = [
      /# todo:/gi,
      /\/\/ todo:/gi,
      /\.\.\.\s*$/gm,  // Ellipsis at end of line
      /# implementation here/gi,
      /\/\/ implementation here/gi,
      /pass\s*$/gm,  // Python pass statements alone
      /placeholder/gi
    ];

    let badCount = 0;
    badPatterns.forEach(pattern => {
      const matches = output.match(pattern);
      if (matches) {
        badCount += matches.length;
      }
    });

    // Good signs (actual code patterns)
    const goodPatterns = [
      /def\s+\w+\s*\(/g,  // Python function definitions
      /class\s+\w+/g,     // Class definitions
      /import\s+\w+/g,    // Import statements
      /function\s+\w+/g,  // JavaScript functions
      /async\s+def/g,     // Async functions
      /assert\s+/g        // Test assertions
    ];

    let goodCount = 0;
    goodPatterns.forEach(pattern => {
      const matches = output.match(pattern);
      if (matches) {
        goodCount += matches.length;
      }
    });

    // Code quality check: more good patterns than bad
    // Allow some TODOs but not if they dominate the code
    return goodCount > badCount * 2;
  }
}
