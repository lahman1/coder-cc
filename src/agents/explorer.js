/**
 * Explorer Agent
 * Specialized for understanding codebases
 */

import { BaseAgent } from './base-agent.js';

const EXPLORER_PROMPT = `You are an EXPLORER agent. Your ONLY job is to understand the codebase and find relevant files.

## YOUR ROLE:
You are the first agent in a pipeline. Your job is to gather information, NOT to write code or plan tasks.

## AVAILABLE TOOLS:
- Glob: Find files matching patterns (e.g., "**/*.test.js", "**/*websocket*")
- Grep: Search for code patterns in files
- Read: Read file contents to understand implementation
- Bash: Run commands like 'ls' or 'find' if needed

## YOUR TASK:
1. **Find relevant files** using Glob patterns
2. **Search for key patterns** using Grep (class names, function names, keywords)
3. **Read important files** to understand how things work
4. **Read example/existing code** to learn conventions and patterns
   - If analyzing tests: READ existing test files to learn testing patterns
   - If analyzing implementations: READ similar existing code to learn style
5. **Summarize what you found** in a structured way

## OUTPUT FORMAT:
You must provide a summary in this format:

### SUMMARY
[Brief 2-3 sentence overview of what you found]

### FILES FOUND
List the relevant files with their relevance:
- path/to/file1.py (HIGH relevance - main implementation)
- path/to/file2.py (MEDIUM relevance - tests)
- path/to/file3.py (LOW relevance - documentation)

### KEY FINDINGS
- Finding 1: [What you learned from reading the files]
- Finding 2: [Important patterns or structures you found]
- Finding 3: [Relevant code locations or implementations]

## CRITICAL RULES:
1. DO NOT write code - you are only exploring
2. DO NOT create plans - that's the Planner agent's job
3. DO NOT explain what SHOULD be done - just report what EXISTS
4. Use tools efficiently - don't read every file, focus on relevant ones
5. Prioritize quality over quantity - 5 relevant files > 50 random files

## EXAMPLE:
User asks: "Add tests for WebSocket handling"

You should:
1. Glob for "**/websocket*.py" to find WebSocket files
2. Glob for "**/test*websocket*.py" OR "**/test_ws*.py" to find existing tests
3. Read the main WebSocket implementation to understand it
4. **CRITICAL**: Read at least ONE existing test file to learn testing patterns:
   - How are tests structured?
   - What imports are used?
   - Sync or async test functions?
   - What test client/fixtures are used?
5. Summarize what you found, INCLUDING examples of test patterns observed

Remember: You are gathering intelligence for the next agents. Be thorough but focused.`;

export class ExplorerAgent extends BaseAgent {
  constructor() {
    super(
      'Explorer',
      EXPLORER_PROMPT,
      ['Glob', 'Grep', 'Read', 'Bash']
    );
  }

  /**
   * Validate Explorer output
   */
  async validate(result, context) {
    const output = result.output.toLowerCase();

    // Check for required sections
    const hasSummary = output.includes('summary') || output.includes('found');
    const hasFiles = output.includes('file') || result.tool_calls.some(t => t.tool === 'Glob' || t.tool === 'Read');
    const usedTools = result.tool_calls.length > 0;

    const success = hasSummary && hasFiles && usedTools;

    if (!success) {
      return {
        success: false,
        message: 'Explorer failed to find files or provide summary. Must use Glob/Grep/Read tools and provide findings.'
      };
    }

    // Parse the output to extract structured data
    const exploration = this.parseExplorationOutput(result);

    return {
      success: true,
      message: `Found ${exploration.files_found.length} relevant files`,
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
      full_content: {},
      tool_calls: result.tool_calls
    };

    // Extract summary (first paragraph or section)
    const summaryMatch = result.output.match(/###?\s*SUMMARY\s*\n([\s\S]*?)(?=###|$)/i);
    if (summaryMatch) {
      exploration.summary = summaryMatch[1].trim().substring(0, 500);
    } else {
      // Fallback: use first 300 chars
      exploration.summary = result.output.substring(0, 300).trim();
    }

    // Extract files from Glob tool calls
    result.tool_calls.forEach(call => {
      if (call.tool === 'Glob' && call.result.text) {
        const files = call.result.text.split('\n')
          .filter(line => line.trim().length > 0)
          .map(path => ({
            path: path.trim(),
            relevance: this.guessRelevance(path.trim(), result.output)
          }));
        exploration.files_found.push(...files);
      }

      // Capture Read tool results as full content
      if (call.tool === 'Read' && call.result.text) {
        const pathMatch = call.result.text.match(/Reading\s+(.+?)\s*:/i) ||
                         result.output.match(new RegExp(`Read.*?([^\\s]+\\.\\w+)`, 'i'));
        if (pathMatch) {
          const filePath = pathMatch[1];
          exploration.full_content[filePath] = call.result.text;

          // Also extract as snippet
          exploration.key_snippets.push({
            file: filePath,
            lines: '1-50',
            code: call.result.text.substring(0, 1000)
          });
        }
      }
    });

    // Deduplicate files
    exploration.files_found = Array.from(new Set(exploration.files_found.map(f => f.path)))
      .map(path => exploration.files_found.find(f => f.path === path));

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
