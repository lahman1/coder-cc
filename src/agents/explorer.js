/**
 * Explorer Agent
 * Specialized for understanding codebases
 */

import { BaseAgent } from './base-agent.js';
import { semanticSearchTool } from './tools/semantic-search.js';

const EXPLORER_PROMPT = `You are an EXPLORER agent. Your ONLY job is to explore and understand EXISTING code.

## CRITICAL RULES - READ CAREFULLY:
[FORBIDDEN] You CANNOT use Write tool - you are NOT allowed to create files
[FORBIDDEN] You CANNOT use Edit tool - you are NOT allowed to modify files
[REQUIRED] You MUST use at least ONE of: Glob, Grep, or Read
[REQUIRED] You MUST follow the exact output format shown below

## YOUR ROLE:
You are the first agent in a pipeline. You EXPLORE the codebase and report findings.
You DO NOT create files. You DO NOT write code. You DO NOT make plans.

## TOOLS YOU CAN USE:
1. Glob - Find files by pattern (ALWAYS start with this)
2. Grep - Search for text in files
3. Read - Read file contents
4. Bash - Run ls, find, etc. (NOT for creating files)
5. SemanticSearch - AI-powered code search (if RAG is available)

## STEP-BY-STEP INSTRUCTIONS:
1. Use Glob to find relevant files (e.g., "**/*.py", "**/*test*")
2. Use SemanticSearch for intelligent queries (e.g., "authentication logic", "API endpoints")
3. Use Grep to search for specific text patterns if SemanticSearch is unavailable
4. Use Read to examine at least ONE file
5. Write your findings in the EXACT format below

## SPECIAL INSTRUCTIONS FOR COMMON TASKS:

### Finding API Endpoints:
- Use Grep to search for route decorators: @app.get, @app.post, @router.get, app.route, etc.
- Search for common patterns: "def get_", "def post_", "async def", "@api", etc.
- Read main application files (app.py, main.py, routes/, endpoints/)
- Look for OpenAPI/Swagger definitions

### Finding Tests:
- Glob for test files: "**/test_*.py", "**/*_test.py", "**/tests/**"
- Read existing test files to understand patterns
- Note test framework used (pytest, unittest, jest, etc.)

### Finding Implementation:
- Start with entry points (main.py, index.js, app.py)
- Follow imports to find core modules
- Use Grep to find class and function definitions

## OUTPUT FORMAT:
You must provide a summary in this EXACT format:

### SUMMARY
[Brief 2-3 sentence overview of what you found]

### FILES FOUND
[List each file with relevance rating and description]
- path/to/file1.py (HIGH relevance - main implementation)
- path/to/file2.py (MEDIUM relevance - tests)
- path/to/file3.py (LOW relevance - documentation)

### KEY FINDINGS
[Specific discoveries from reading the files]
- Finding 1: [What you learned from reading the files]
- Finding 2: [Important patterns or structures you found]
- Finding 3: [Relevant code locations or implementations]

### CODE PATTERNS
[If applicable, list patterns found]
- Pattern: [e.g., "@app.get('/path')" for FastAPI routes]
- Location: [Where this pattern is used]

## CRITICAL RULES:
[NEVER] DO NOT write code - you ONLY explore
[NEVER] DO NOT use Write or Edit tools
[NEVER] DO NOT create plans - that's the Planner's job
[ALWAYS] Use Glob first, then Grep or Read
[ALWAYS] Read at least ONE file before finishing

## EXAMPLE OF CORRECT BEHAVIOR:
User request: "Create a hello world script"

WRONG approach (DO NOT DO THIS):
- Using Write tool to create the file [FORBIDDEN]

CORRECT approach:
1. Use Glob "**/*.py" to find existing Python files
2. Use Read on one file to understand code style
3. Report findings: "Found X Python files, examined style in Y"
4. Let the NEXT agents handle file creation

## IMPORTANT FOR FILE CREATION REQUESTS:
When user asks to CREATE a new file:
- You still EXPLORE the codebase to understand conventions
- You find similar existing files
- You report what you found
- The PLANNER will plan the creation
- The CODER will actually create it

Remember: You EXPLORE. You don't CREATE. Even for "create file" requests.`;

export class ExplorerAgent extends BaseAgent {
  constructor() {
    super(
      'Explorer',
      EXPLORER_PROMPT,
      ['Glob', 'Grep', 'Read', 'Bash', 'SemanticSearch']
    );
    this.semanticSearchTool = semanticSearchTool;
  }

  /**
   * Validate Explorer output
   */
  async validate(result, context) {
    const output = result.output;
    const outputLower = output.toLowerCase();

    // Check for required tools
    const usedGlob = result.tool_calls.some(t => t.tool === 'Glob');
    const usedGrep = result.tool_calls.some(t => t.tool === 'Grep');
    const usedRead = result.tool_calls.some(t => t.tool === 'Read');
    const usedTools = result.tool_calls.length > 0;

    // Check for required sections
    const hasSummary = outputLower.includes('### summary') || outputLower.includes('## summary');
    const hasFilesSection = outputLower.includes('### files found') || outputLower.includes('## files found');
    const hasFindings = outputLower.includes('### key findings') || outputLower.includes('## key findings');

    // Build validation details
    const validationDetails = {
      missingTools: [],
      missingSections: [],
      suggestion: ''
    };

    // Check tool usage
    if (!usedTools) {
      return {
        success: false,
        message: 'Explorer must use tools to explore the codebase.',
        details: {
          missingTools: ['Glob', 'Grep or Read'],
          suggestion: 'Use Glob to find files, then Grep to search for patterns or Read to examine files.'
        }
      };
    }

    // For API endpoint tasks, should use Grep
    if (context.request && context.request.toLowerCase().includes('endpoint') && !usedGrep) {
      validationDetails.missingTools.push('Grep (for finding API endpoints)');
    }

    // Check output structure
    if (!hasSummary) validationDetails.missingSections.push('SUMMARY section');
    if (!hasFilesSection) validationDetails.missingSections.push('FILES FOUND section');
    if (!hasFindings) validationDetails.missingSections.push('KEY FINDINGS section');

    if (validationDetails.missingSections.length > 0) {
      return {
        success: false,
        message: `Explorer output missing required sections: ${validationDetails.missingSections.join(', ')}`,
        details: {
          missingSections: validationDetails.missingSections,
          suggestion: 'Follow the OUTPUT FORMAT section exactly. Include ### SUMMARY, ### FILES FOUND, and ### KEY FINDINGS sections.'
        }
      };
    }

    // Parse the output to extract structured data
    const exploration = this.parseExplorationOutput(result);

    // Validate parsed data
    if (exploration.files_found.length === 0) {
      // Check if the agent at least tried to find files
      const usedGlob = result.tool_calls.some(t => t.tool === 'Glob');
      if (!usedGlob) {
        return {
          success: false,
          message: 'Explorer must use Glob to search for files.',
          details: {
            missingTools: ['Glob'],
            suggestion: 'Use Glob with patterns like "**/*.py" to search for files.'
          }
        };
      }
      // If Glob was used but no files found, that's OK - the codebase might be empty
      // Just make sure the output format is correct
      if (hasSummary && hasFilesSection && hasFindings) {
        return {
          success: true,
          message: 'No files found (codebase appears empty), but exploration was performed correctly',
          data: exploration
        };
      }
    }

    // Check quality of exploration when files ARE found
    const readCount = result.tool_calls.filter(t => t.tool === 'Read').length;
    if (exploration.files_found.length > 0 && readCount === 0) {
      return {
        success: false,
        message: 'Explorer found files but did not read any. Must Read at least one file to understand the codebase.',
        details: {
          missingTools: ['Read'],
          suggestion: 'After finding files with Glob, use Read to examine the most relevant ones.'
        }
      };
    }

    return {
      success: true,
      message: `Found ${exploration.files_found.length} relevant files, read ${readCount} files`,
      data: exploration
    };
  }

  /**
   * Parse the Explorer's output into structured data
   */
  parseExplorationOutput(result) {
    const exploration = {
      summary: '',
      files_found: [],
      key_snippets: [],
      code_patterns: [],
      full_content: {},
      tool_calls: result.tool_calls
    };

    // Extract summary section
    const summaryMatch = result.output.match(/###?\s*SUMMARY\s*\n([\s\S]*?)(?=###|\n\n##|$)/i);
    if (summaryMatch) {
      exploration.summary = summaryMatch[1].trim().substring(0, 500);
    } else {
      // Fallback: use first 300 chars
      exploration.summary = result.output.substring(0, 300).trim();
    }

    // Extract FILES FOUND section from output text
    const filesFoundMatch = result.output.match(/###?\s*FILES FOUND\s*\n([\s\S]*?)(?=###|\n\n##|$)/i);
    if (filesFoundMatch) {
      const fileLines = filesFoundMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
      fileLines.forEach(line => {
        const fileMatch = line.match(/-\s*([^\s]+\.[\w]+)\s*\(([^)]+)\)/);
        if (fileMatch) {
          exploration.files_found.push({
            path: fileMatch[1].trim(),
            relevance: fileMatch[2].includes('HIGH') ? 'HIGH' :
                      fileMatch[2].includes('MEDIUM') ? 'MEDIUM' : 'LOW',
            description: fileMatch[2]
          });
        }
      });
    }

    // Extract CODE PATTERNS section if present
    const patternsMatch = result.output.match(/###?\s*CODE PATTERNS\s*\n([\s\S]*?)(?=###|\n\n##|$)/i);
    if (patternsMatch) {
      const patternLines = patternsMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
      patternLines.forEach(line => {
        const patternMatch = line.match(/-\s*Pattern:\s*(.+)/i);
        const locationMatch = line.match(/-\s*Location:\s*(.+)/i);
        if (patternMatch) {
          exploration.code_patterns.push({
            pattern: patternMatch[1].trim(),
            location: locationMatch ? locationMatch[1].trim() : ''
          });
        }
      });
    }

    // Also extract files from Glob tool calls (as backup)
    result.tool_calls.forEach(call => {
      if (call.tool === 'Glob' && call.result.text) {
        const files = call.result.text.split('\n')
          .filter(line => line.trim().length > 0 && !line.includes('No files found'))
          .map(path => {
            // Check if this file is already in files_found
            const existing = exploration.files_found.find(f => f.path === path.trim());
            if (!existing) {
              return {
                path: path.trim(),
                relevance: this.guessRelevance(path.trim(), result.output),
                description: 'Found via Glob'
              };
            }
            return null;
          })
          .filter(f => f !== null);
        exploration.files_found.push(...files);
      }

      // Capture Read tool results
      if (call.tool === 'Read' && call.result.text) {
        // Try to extract the file path from the Read result
        const lines = call.result.text.split('\n');
        let filePath = null;

        // Look for file path in the first few lines
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const pathMatch = lines[i].match(/(?:Reading|File|Path).*?([\/\w.-]+\.[\w]+)/i);
          if (pathMatch) {
            filePath = pathMatch[1];
            break;
          }
        }

        if (filePath) {
          exploration.full_content[filePath] = call.result.text;

          // Extract meaningful snippet
          const codeStart = call.result.text.indexOf('\n') + 1;
          exploration.key_snippets.push({
            file: filePath,
            lines: '1-50',
            code: call.result.text.substring(codeStart, codeStart + 1000)
          });
        }
      }

      // Capture Grep results for patterns
      if (call.tool === 'Grep' && call.result.text) {
        const grepLines = call.result.text.split('\n').filter(l => l.trim());
        if (grepLines.length > 0 && !call.result.text.includes('No matches found')) {
          // Store grep results as patterns found
          grepLines.slice(0, 10).forEach(line => {
            if (line.includes(':')) {
              const [file, content] = line.split(':', 2);
              exploration.code_patterns.push({
                pattern: content.trim(),
                location: file.trim()
              });
            }
          });
        }
      }
    });

    // Deduplicate files
    const uniquePaths = new Set();
    exploration.files_found = exploration.files_found.filter(f => {
      if (!uniquePaths.has(f.path)) {
        uniquePaths.add(f.path);
        return true;
      }
      return false;
    });

    return exploration;
  }

  /**
   * Guess file relevance based on path and context
   */
  guessRelevance(path, output) {
    const outputLower = output.toLowerCase();
    const pathLower = path.toLowerCase();

    // HIGH relevance indicators
    if (outputLower.includes(pathLower) ||
        outputLower.includes('main') && pathLower.includes('main') ||
        outputLower.includes('important') && pathLower.includes(path.split('/').pop())) {
      return 'HIGH';
    }

    // MEDIUM relevance for test files
    if (pathLower.includes('test')) {
      return 'MEDIUM';
    }

    // LOW for docs, examples, etc.
    if (pathLower.includes('doc') || pathLower.includes('example') || pathLower.includes('demo')) {
      return 'LOW';
    }

    return 'MEDIUM';
  }
}
