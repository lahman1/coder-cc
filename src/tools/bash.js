/**
 * Bash Tool
 * Execute bash commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BashTool {
  constructor() {
    this.name = 'Bash';
    this.description = 'Execute bash commands in the shell';
    this.inputSchema = {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 120000)'
        }
      },
      required: ['command']
    };
  }

  async execute(input, context = {}) {
    const { command, timeout = 120000 } = input;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd: context.workingDirectory || process.cwd(),
        env: { ...process.env, ...context.env }
      });

      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += stderr;

      // Truncate if too long
      const maxLength = context.bashMaxOutputLength || 30000;
      if (output.length > maxLength) {
        output = output.substring(0, maxLength) + '\n... (output truncated)';
      }

      return {
        type: 'text',
        text: output || '(command completed with no output)'
      };
    } catch (error) {
      return {
        type: 'text',
        text: `Error executing command: ${error.message}\n${error.stderr || ''}`
      };
    }
  }
}
