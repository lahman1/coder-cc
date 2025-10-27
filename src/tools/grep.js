/**
 * Grep Tool
 * Search for text patterns in files
 */

import { execSync } from 'child_process';

export class GrepTool {
  constructor() {
    this.name = 'Grep';
    this.description = 'Search for a pattern in files using regex';
    this.inputSchema = {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The regex pattern to search for'
        },
        path: {
          type: 'string',
          description: 'File or directory to search in (default: current directory)'
        },
        glob: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g., "*.js")'
        },
        output_mode: {
          type: 'string',
          enum: ['content', 'files_with_matches', 'count'],
          description: 'Output mode (default: files_with_matches)'
        },
        '-i': {
          type: 'boolean',
          description: 'Case insensitive search'
        },
        '-n': {
          type: 'boolean',
          description: 'Show line numbers'
        }
      },
      required: ['pattern']
    };
  }

  async execute(input, context = {}) {
    const {
      pattern,
      path = '.',
      glob,
      output_mode = 'files_with_matches',
      '-i': caseInsensitive = false,
      '-n': showLineNumbers = false
    } = input;

    try {
      // Build grep command (using ripgrep if available, otherwise grep)
      let cmd = 'rg';
      let args = [];

      // Try to use ripgrep first
      try {
        execSync('which rg', { stdio: 'ignore' });
      } catch {
        // Fallback to grep
        cmd = 'grep';
      }

      // Add options
      if (caseInsensitive) args.push('-i');
      if (showLineNumbers && output_mode === 'content') args.push('-n');

      // Output mode
      if (output_mode === 'files_with_matches') {
        args.push('-l');
      } else if (output_mode === 'count') {
        args.push('-c');
      }

      // Add glob pattern
      if (glob && cmd === 'rg') {
        args.push('--glob', glob);
      }

      // Recursive search
      if (cmd === 'rg') {
        args.push('--');
      } else {
        args.push('-r');
      }

      // Add pattern and path
      args.push(pattern);
      args.push(path);

      const fullCmd = `${cmd} ${args.join(' ')}`;
      const result = execSync(fullCmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        cwd: context.workingDirectory || process.cwd()
      });

      return {
        type: 'text',
        text: result.trim() || 'No matches found'
      };
    } catch (error) {
      // Exit code 1 means no matches found
      if (error.status === 1) {
        return {
          type: 'text',
          text: 'No matches found'
        };
      }

      return {
        type: 'error',
        error: `Grep error: ${error.message}`
      };
    }
  }
}
