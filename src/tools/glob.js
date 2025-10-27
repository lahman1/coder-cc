/**
 * Glob Tool
 * Find files matching a glob pattern
 */

import { globSync } from 'glob';

export class GlobTool {
  constructor() {
    this.name = 'Glob';
    this.description = 'Find files matching a glob pattern (e.g., "**/*.js")';
    this.inputSchema = {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The glob pattern to match files against'
        },
        path: {
          type: 'string',
          description: 'The directory to search in (optional, defaults to cwd)'
        }
      },
      required: ['pattern']
    };
  }

  async execute(input, context = {}) {
    const { pattern, path } = input;

    try {
      const options = {
        cwd: path || context.workingDirectory || process.cwd(),
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        nodir: true
      };

      const files = globSync(pattern, options);

      if (files.length === 0) {
        return {
          type: 'text',
          text: 'No files found'
        };
      }

      return {
        type: 'text',
        text: files.join('\n')
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Glob pattern error: ${error.message}`
      };
    }
  }
}
