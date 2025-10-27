/**
 * Read Tool
 * Read file contents
 */

import { readFileSync } from 'fs';

export class ReadTool {
  constructor() {
    this.name = 'Read';
    this.description = 'Read the contents of a file';
    this.inputSchema = {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The absolute path to the file to read'
        },
        offset: {
          type: 'number',
          description: 'Line number to start reading from (optional)'
        },
        limit: {
          type: 'number',
          description: 'Number of lines to read (optional)'
        }
      },
      required: ['file_path']
    };
  }

  async execute(input, context = {}) {
    const { file_path, offset = 0, limit } = input;

    try {
      const content = readFileSync(file_path, 'utf-8');
      const lines = content.split('\n');

      // Apply offset and limit
      let selectedLines = lines;
      if (offset > 0 || limit) {
        const start = offset;
        const end = limit ? start + limit : lines.length;
        selectedLines = lines.slice(start, end);
      }

      // Add line numbers (1-indexed)
      const numbered = selectedLines
        .map((line, idx) => `${offset + idx + 1}\t${line}`)
        .join('\n');

      return {
        type: 'text',
        text: numbered
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to read file: ${error.message}`
      };
    }
  }
}
