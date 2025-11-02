/**
 * RAGQuery Tool
 * Allows agents to perform semantic search on indexed codebase
 */

import { getQueryInstance } from '../rag/query.js';

export class RAGQueryTool {
  constructor() {
    this.name = 'RAGQuery';
    this.description = `Perform semantic search on the indexed codebase to find relevant code examples, patterns, and conventions.

Use this tool to:
- Find similar code implementations ("WebSocket connection handling")
- Find test patterns ("pytest async test examples")
- Discover project conventions ("how are imports structured")
- Find specific functions or classes by description
- Learn from existing code before writing new code

This is especially useful for understanding:
- Testing patterns (what fixtures exist, how tests are structured)
- Import conventions (what modules are commonly used)
- Code style (how similar features are implemented)
- Available utilities (what helper functions exist)

Examples:
- "Find WebSocket server implementations"
- "Show me async test patterns using pytest"
- "How are database connections handled"
- "What test fixtures are available"`;

    this.inputSchema = {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Semantic search query describing what code you want to find. Be specific about the functionality or pattern you need.'
        },
        language: {
          type: 'string',
          description: 'Filter by programming language (e.g., "python", "javascript", "typescript"). Optional.',
          enum: ['python', 'javascript', 'typescript', 'java', 'cpp', 'c']
        },
        type: {
          type: 'string',
          description: 'Filter by code type. Optional.',
          enum: ['function', 'class', 'test', 'file']
        },
        top_k: {
          type: 'number',
          description: 'Number of results to return (default: 5, max: 20)',
          default: 5
        }
      },
      required: ['query']
    };
  }

  /**
   * Execute RAGQuery tool
   */
  async execute(args, context = {}) {
    const {
      query,
      language = null,
      type = null,
      top_k = 5
    } = args;

    try {
      // Get query instance
      const queryEngine = await getQueryInstance();

      // Perform search
      const results = await queryEngine.search(query, {
        language: language,
        type: type,
        topK: Math.min(top_k, 20) // Cap at 20
      });

      // Format results for LLM consumption
      const formattedOutput = formatRAGResults(results, query);

      return {
        success: true,
        text: formattedOutput,
        data: results
      };

    } catch (error) {
      // RAG system might not be initialized - return helpful error
      if (error.message.includes('Collection') || error.message.includes('not found')) {
        return {
          success: false,
          text: `⚠️ RAG system not initialized. Run '/index' command to index the codebase first.\n\nError: ${error.message}`
        };
      }

      return {
        success: false,
        text: `❌ RAG query failed: ${error.message}`
      };
    }
  }
}

/**
 * Format RAG results for LLM
 */
function formatRAGResults(results, query) {
  if (!results || results.length === 0) {
    return `No results found for query: "${query}"\n\nThe codebase might not be indexed yet, or there are no matching patterns.`;
  }

  let output = `Found ${results.length} relevant code snippet(s) for: "${query}"\n\n`;

  results.forEach((result, index) => {
    output += `## Result ${index + 1}: ${result.name} (${result.type})\n`;
    output += `**File**: ${result.file}:${result.line}\n`;
    output += `**Language**: ${result.language}\n`;
    output += `**Similarity**: ${(result.similarity * 100).toFixed(1)}%\n\n`;

    // Show imports if available
    if (result.metadata.imports && result.metadata.imports.length > 0) {
      output += `**Imports**:\n`;
      result.metadata.imports.slice(0, 5).forEach(imp => {
        output += `  ${imp}\n`;
      });
      if (result.metadata.imports.length > 5) {
        output += `  ... and ${result.metadata.imports.length - 5} more\n`;
      }
      output += `\n`;
    }

    // Show code snippet (truncate if too long)
    output += `**Code**:\n\`\`\`${result.language}\n`;
    const maxCodeLength = 800;
    if (result.text.length > maxCodeLength) {
      output += result.text.substring(0, maxCodeLength) + '\n... (truncated)\n';
    } else {
      output += result.text + '\n';
    }
    output += `\`\`\`\n\n`;

    output += `---\n\n`;
  });

  // Add usage hint
  output += `**💡 Usage Tip**: Use these examples to understand the project's conventions and patterns. Match the style, imports, and structure when writing new code.`;

  return output;
}
