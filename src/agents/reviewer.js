/**
 * Reviewer Agent
 * Specialized for validating and fixing generated code
 */

import { BaseAgent } from './base-agent.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REVIEWER_PROMPT = `You are a REVIEWER agent. Your job is to validate generated code and fix issues.

## YOUR ROLE:
You are the fourth agent in a pipeline. The Coder agent just created files - you must verify they work and fix issues.

## AVAILABLE TOOLS:
- Read: Read files to check what was created
- Edit: Fix issues in existing files (imports, syntax, patterns)
- Bash: Run tests and validation commands (pytest, node, npm test, etc.)
- Grep: Search for correct imports, patterns, fixtures
- Glob: Find files that were created (use sparingly - only to locate test files)
- RAGQuery: Query codebase for correct patterns when fixing (use only if Grep fails)
- TodoWrite: Track fixes you make

## TOOL USAGE GUIDELINES:
- **First**: Use Bash to run validation (syntax check, tests)
- **If errors found**: Use Read to examine the broken file
- **To fix imports**: Use Grep first (fast), RAGQuery as fallback (semantic search)
- **To find files**: Only use Glob if you don't know the file path
- **To fix code**: Use Edit to make targeted changes
- **Track progress**: Use TodoWrite for complex multi-fix scenarios

## FORBIDDEN TOOLS:
⚠️ You are FORBIDDEN from using Write to create new files. Your job is VALIDATION and FIXING, not creation.
⚠️ Do NOT use Glob/RAGQuery unless you truly need them. Start with Bash validation first.

## YOUR TASK:
1. **Identify files created** by the Coder agent
2. **Run validation checks**:
   - Syntax validation (python -m py_compile, node import test)
   - Import validation (do imports actually exist?)
   - Test execution (pytest, npm test)
3. **Auto-fix common issues**:
   - Wrong import paths → Use Grep to find correct path, Edit to fix
   - Missing dependencies → Add imports
   - Syntax errors → Fix escaped quotes, indentation, etc.
4. **Report results**:
   - List all fixes made
   - Report unfixable issues
   - Confirm if code is ready to use

## AUTO-FIX STRATEGIES:

### Import Errors:
If you see: \`ImportError: cannot import name 'Foo' from 'bar'\`
1. Use Grep to search for 'class Foo' or 'def Foo' in codebase
2. Find the correct file path
3. Use Edit to fix the import statement

### Syntax Errors:
If you see: \`SyntaxError: invalid syntax\`
1. Read the file to identify the issue
2. Common fixes: escaped quotes (\\" → "), indentation, missing colons
3. Use Edit to fix

### Missing Fixtures/Functions:
If you see: \`NameError: name 'fixture_name' is not defined\`
1. Use Grep to search for '@pytest.fixture' or similar in test files
2. Either import the fixture or remove the reference
3. Use Edit to fix

## VALIDATION WORKFLOW:

### For Python files:
\`\`\`bash
# Step 1: Syntax check
python3 -m py_compile file.py

# Step 2: Run tests (if test file)
pytest file.py -v

# Step 3: Check imports
python3 -c "import sys; sys.path.insert(0, '.'); import module_name"
\`\`\`

### For JavaScript files:
\`\`\`bash
# Step 1: Syntax check
node --check file.js

# Step 2: Run tests (if test file)
npm test file.js
\`\`\`

## CRITICAL RULES:
1. Run validation BEFORE attempting fixes (understand the problem first)
2. Make ONE fix at a time, then re-validate
3. Use Edit tool for all fixes (not Write)
4. Track every fix you make with TodoWrite
5. If you can't fix after 2 attempts, report the issue and stop

## OUTPUT FORMAT:
You must provide a summary:

### VALIDATION RESULTS
- Files validated: X
- Issues found: Y
- Auto-fixes applied: Z

### FIXES MADE
1. Fixed import in file.py: 'from wrong import X' → 'from correct import X'
2. Fixed syntax error in file.js: removed escaped quotes
3. ...

### REMAINING ISSUES (if any)
- Issue 1: Description and what user needs to do
- Issue 2: ...

### STATUS
✅ All files validated and working
OR
⚠️ Some issues remain (see above)

## EXAMPLES:

### Example 1: Import Error
**Error**: \`ImportError: cannot import 'echo_handler' from 'websocket_server'\`

**Fix**:
1. Use Grep to find: \`grep -r "def echo_handler" .\`
2. Found in: \`src/websocket_server.py\`
3. Edit import: \`from websocket_server\` → \`from src.websocket_server\`
4. Re-run test to verify

### Example 2: Missing Fixture
**Error**: \`NameError: name 'client' is not defined\`

**Fix**:
1. Use Grep: \`grep -r "@pytest.fixture" tests/\`
2. Found: \`@pytest.fixture def client()\` in \`tests/conftest.py\`
3. Add import: \`from conftest import client\` (or use directly if in same dir)
4. Re-run test to verify

Remember: Your goal is to make the code WORK. Fix what you can, report what you can't.

⚠️ MANDATORY: You MUST run validation (Bash) and attempt at least one fix if issues found.`;

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super(
      'Reviewer',
      REVIEWER_PROMPT,
      ['Read', 'Edit', 'Bash', 'Grep', 'Glob', 'RAGQuery', 'TodoWrite']
    );
  }

  /**
   * Validate Reviewer output - MUST have run validation
   */
  async validate(result, context) {
    // Check if Bash was used (validation requires running commands)
    const bashCalls = result.tool_calls.filter(call => call.tool === 'Bash');

    if (bashCalls.length === 0) {
      return {
        success: false,
        message: 'Reviewer MUST run validation commands using Bash tool. No validation detected.'
      };
    }

    // Extract validation results
    const validation = this.extractValidationResults(result);

    // Check if fixes were attempted (if issues found)
    const editCalls = result.tool_calls.filter(call => call.tool === 'Edit');
    const issuesFound = validation.issues_found > 0;
    const fixesAttempted = editCalls.length > 0;

    if (issuesFound && !fixesAttempted) {
      return {
        success: false,
        message: `Reviewer found ${validation.issues_found} issues but didn't attempt any fixes. Must try to auto-fix.`
      };
    }

    return {
      success: true,
      message: `Validated ${validation.files_validated} file(s), made ${validation.fixes_applied} fix(es)`,
      data: {
        validation: validation,
        fixes: this.extractFixes(result),
        raw_output: result.output
      }
    };
  }

  /**
   * Extract validation results from output
   */
  extractValidationResults(result) {
    const output = result.output;

    const validation = {
      files_validated: 0,
      issues_found: 0,
      fixes_applied: 0,
      status: 'unknown'
    };

    // Count files validated
    const filesMatch = output.match(/Files validated:\s*(\d+)/i);
    if (filesMatch) {
      validation.files_validated = parseInt(filesMatch[1]);
    }

    // Count issues found
    const issuesMatch = output.match(/Issues found:\s*(\d+)/i);
    if (issuesMatch) {
      validation.issues_found = parseInt(issuesMatch[1]);
    }

    // Count fixes applied
    const fixesMatch = output.match(/(?:Auto-)?fixes applied:\s*(\d+)/i);
    if (fixesMatch) {
      validation.fixes_applied = parseInt(fixesMatch[1]);
    }

    // Determine status
    if (output.toLowerCase().includes('all files validated and working')) {
      validation.status = 'success';
    } else if (output.toLowerCase().includes('some issues remain')) {
      validation.status = 'partial';
    } else {
      validation.status = 'unknown';
    }

    return validation;
  }

  /**
   * Extract list of fixes made
   */
  extractFixes(result) {
    const fixes = [];

    // Look for "FIXES MADE" section
    const fixesSection = result.output.match(/###?\s*FIXES MADE\s*\n([\s\S]*?)(?=###|$)/i);

    if (fixesSection) {
      const lines = fixesSection[1].split('\n');
      lines.forEach(line => {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          fixes.push(match[1].trim());
        }
      });
    }

    // If no formatted section, extract from Edit tool calls
    if (fixes.length === 0) {
      result.tool_calls.forEach(call => {
        if (call.tool === 'Edit' && call.result.text) {
          fixes.push(`Modified file (Edit tool used)`);
        }
      });
    }

    return fixes;
  }

  /**
   * Helper: Run syntax validation on a file
   */
  async validateFileSyntax(filePath) {
    try {
      if (filePath.endsWith('.py')) {
        await execAsync(`python3 -m py_compile "${filePath}"`, { timeout: 5000 });
        return { valid: true };
      } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        await execAsync(`node --check "${filePath}"`, { timeout: 5000 });
        return { valid: true };
      } else if (filePath.endsWith('.ts')) {
        await execAsync(`tsc --noEmit "${filePath}"`, { timeout: 5000 });
        return { valid: true };
      }
      return { valid: true, message: 'No validation available for this file type' };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        stderr: error.stderr
      };
    }
  }

  /**
   * Helper: Run tests on a file
   */
  async runTests(filePath) {
    try {
      if (filePath.includes('test') && filePath.endsWith('.py')) {
        const result = await execAsync(`pytest "${filePath}" -v`, { timeout: 30000 });
        return {
          success: true,
          stdout: result.stdout,
          stderr: result.stderr
        };
      } else if (filePath.includes('test') && filePath.endsWith('.js')) {
        const result = await execAsync(`npm test "${filePath}"`, { timeout: 30000 });
        return {
          success: true,
          stdout: result.stdout,
          stderr: result.stderr
        };
      }
      return { success: true, message: 'No test runner available' };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      };
    }
  }
}
