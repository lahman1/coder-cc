/**
 * Tool Registry
 * Exports all available tools
 */

import { BashTool } from './bash.js';
import { ReadTool } from './read.js';
import { WriteTool } from './write.js';
import { EditTool } from './edit.js';
import { GlobTool } from './glob.js';
import { GrepTool } from './grep.js';
import { TodoWriteTool } from './todo-write.js';
import { WebFetchTool } from './web-fetch.js';
import { WebSearchTool } from './web-search.js';
import { RAGQueryTool } from './rag-query.js';

export const TOOLS = {
  Bash: BashTool,
  Read: ReadTool,
  Write: WriteTool,
  Edit: EditTool,
  Glob: GlobTool,
  Grep: GrepTool,
  TodoWrite: TodoWriteTool,
  WebFetch: WebFetchTool,
  WebSearch: WebSearchTool,
  RAGQuery: RAGQueryTool
};

/**
 * Get tool definitions for LLM
 */
export function getToolDefinitions() {
  return Object.entries(TOOLS).map(([name, ToolClass]) => {
    const tool = new ToolClass();
    return {
      name: name,
      description: tool.description,
      input_schema: tool.inputSchema
    };
  });
}

/**
 * Execute a tool by name
 */
export async function executeTool(name, input, context = {}) {
  const ToolClass = TOOLS[name];

  if (!ToolClass) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const tool = new ToolClass();
  return await tool.execute(input, context);
}
