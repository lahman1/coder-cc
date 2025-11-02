/**
 * Write Tool
 * Write content to a file
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class WriteTool {
  constructor() {
    this.name = 'Write';
    this.description = 'Create new files or overwrite existing files with content. Use this to CREATE files when completing tasks like writing tests, example code, implementations, or any deliverables requested by the user.';
    this.inputSchema = {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The absolute path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['file_path', 'content']
    };
  }

  async execute(input, context = {}) {
    const { file_path, content } = input;

    try {
      // Ensure directory exists
      const dir = dirname(file_path);
      mkdirSync(dir, { recursive: true });

      // Write file
      writeFileSync(file_path, content, 'utf-8');

      return {
        type: 'text',
        text: `File written successfully: ${file_path}`
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to write file: ${error.message}`
      };
    }
  }
}
