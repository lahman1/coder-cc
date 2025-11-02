/**
 * Coder Agent
 * Specialized for writing code files
 */

import { BaseAgent } from './base-agent.js';

const CODER_PROMPT = `You are a CODER agent. Your job is to WRITE CODE using Write/Edit tools.

## CRITICAL MINDSET:
YOU ARE A DOER, NOT AN EXPLAINER.
When you see "Create file X", you immediately use Write tool.
When you see "Modify file Y", you immediately use Edit tool.
NO EXPLANATIONS. JUST ACTION.

## YOUR ROLE:
You execute the checklist by ACTUALLY creating/modifying files.
You DO NOT explain what you would do. You DO IT.

## TOOLS YOU MUST USE:
- Write: [PRIMARY] Create new files (USE THIS IMMEDIATELY)
- Edit: [PRIMARY] Modify existing files (USE THIS IMMEDIATELY)
- Read: Read files for reference
- TodoWrite: Mark tasks complete
- Glob/Grep: Find files if needed

## FORBIDDEN:
- Bash [NEVER] - You write code, not run it
- Explaining instead of doing [NEVER]

## EXECUTION PATTERN:
For EACH todo item:
1. Read the task
2. IMMEDIATELY use Write or Edit
3. Mark as complete with TodoWrite
4. Move to next task

NO TALKING. JUST DOING.

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

## EXAMPLE - RIGHT vs WRONG:

Checklist says: "Create tests/test_hello.py with hello world function"

WRONG (DO NOT DO THIS):
"I will create a Python file that prints hello world..."
"The file should contain a function that..."
"Here's what the code would look like..."

RIGHT (DO THIS):
[Immediately use Write tool]
Write({
  "file_path": "tests/test_hello.py",
  "content": "def hello():\n    print('Hello World')\n\nif __name__ == '__main__':\n    hello()"
})

Then mark complete with TodoWrite.
NO EXPLANATION. JUST ACTION.

## WHAT SUCCESS LOOKS LIKE:
[OK] Every checklist item is completed
[OK] All requested files are created with Write tool
[OK] Files contain complete, working code
[OK] Code follows project conventions
[OK] TodoWrite shows all items as completed

## WHAT FAILURE LOOKS LIKE:
[X] Explaining what code should look like without writing it
[X] Creating partial/incomplete files
[X] Stopping before finishing the checklist
[X] Writing TODO comments instead of real code
[X] Not using Write/Edit tools

Remember: You are the DOER, not the EXPLAINER. Code speaks louder than words!

[MANDATORY] You MUST use Write or Edit tool at least once. If you don't create files, you fail.`;

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
    const todoWriteCall = result.tool_calls.find(call => call.tool === 'TodoWrite');

    if (!writeCall && !editCall) {
      return {
        success: false,
        message: 'Coder MUST use Write or Edit tool to create/modify files. No file operations detected.',
        details: {
          missingTools: ['Write or Edit'],
          suggestion: 'You must use Write to create new files or Edit to modify existing files. Your job is to WRITE CODE, not explain it.'
        }
      };
    }

    // Extract files created/modified
    const filesCreated = this.extractFilesCreated(result);

    if (filesCreated.length === 0) {
      return {
        success: false,
        message: 'Write/Edit tools were called but no valid files were created.',
        details: {
          requiredCount: 1,
          suggestion: 'Ensure Write/Edit calls completed successfully. Check file paths are valid and content is provided.'
        }
      };
    }

    // Check if code looks complete (not just TODO comments)
    const codeQualityCheck = this.validateCodeQuality(result);

    if (!codeQualityCheck.isValid) {
      return {
        success: false,
        message: 'Files were created but appear to contain placeholders or TODO comments instead of working code.',
        details: {
          issues: codeQualityCheck.issues,
          suggestion: 'Write complete, working code. Replace TODO comments with actual implementations. Include all necessary imports, function bodies, and logic.'
        }
      };
    }

    // Validate syntax of generated code files
    const syntaxCheck = await this.validateSyntax(filesCreated);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        message: 'Generated code has syntax errors.',
        details: {
          syntaxErrors: syntaxCheck.errors,
          suggestion: 'Fix syntax errors in the generated code. Common issues: unmatched brackets, missing colons, incorrect indentation.'
        }
      };
    }

    // Check if TodoWrite was used to update progress
    if (context.plan && context.plan.todos && !todoWriteCall) {
      console.log('  [WARNING] Coder did not update todos with TodoWrite to mark tasks complete');
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
          console.log(`  [WARNING] Fixed escaped quotes in ${file.path}`);
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
    const output = result.output;
    const issues = [];

    // Bad signs (TODO comments, placeholders)
    const badPatterns = [
      { pattern: /# todo:/gi, description: 'TODO comments found' },
      { pattern: /\/\/ todo:/gi, description: 'TODO comments found' },
      { pattern: /\.\.\.\s*$/gm, description: 'Ellipsis placeholders found' },
      { pattern: /# implementation here/gi, description: 'Placeholder comments found' },
      { pattern: /\/\/ implementation here/gi, description: 'Placeholder comments found' },
      { pattern: /pass\s*$/gm, description: 'Empty pass statements found' },
      { pattern: /placeholder/gi, description: 'Placeholder text found' }
    ];

    let badCount = 0;
    badPatterns.forEach(check => {
      const matches = output.match(check.pattern);
      if (matches && matches.length > 0) {
        badCount += matches.length;
        issues.push(`${check.description} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`);
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
    const isValid = goodCount > badCount * 2;

    return {
      isValid: isValid,
      issues: issues,
      goodCount: goodCount,
      badCount: badCount
    };
  }
}
