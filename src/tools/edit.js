/**
 * Edit Tool
 * Edit file by replacing old_string with new_string
 */

import { readFileSync, writeFileSync } from 'fs';

export class EditTool {
  constructor() {
    this.name = 'Edit';
    this.description = 'Modify existing files by replacing specific text. Use this to make precise changes to existing code, update implementations, or fix issues in files that already exist.';
    this.inputSchema = {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'The absolute path to the file to edit'
        },
        old_string: {
          type: 'string',
          description: 'The text to replace'
        },
        new_string: {
          type: 'string',
          description: 'The text to replace it with'
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace all occurrences (default: false)'
        }
      },
      required: ['file_path', 'old_string', 'new_string']
    };
  }

  async execute(input, context = {}) {
    const { file_path, old_string, new_string, replace_all = false } = input;

    try {
      const content = readFileSync(file_path, 'utf-8');

      // Check if old_string exists
      if (!content.includes(old_string)) {
        return {
          type: 'error',
          error: 'The old_string was not found in the file'
        };
      }

      // Check if old_string is unique (if not replacing all)
      if (!replace_all) {
        const occurrences = content.split(old_string).length - 1;
        if (occurrences > 1) {
          return {
            type: 'error',
            error: `The old_string appears ${occurrences} times in the file. Use replace_all=true or provide a more specific old_string.`
          };
        }
      }

      // Perform replacement
      const newContent = replace_all
        ? content.replaceAll(old_string, new_string)
        : content.replace(old_string, new_string);

      // Write back to file
      writeFileSync(file_path, newContent, 'utf-8');

      return {
        type: 'text',
        text: `File edited successfully: ${file_path}`
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to edit file: ${error.message}`
      };
    }
  }
}
