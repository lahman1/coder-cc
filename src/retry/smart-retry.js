/**
 * Smart Retry System
 * Implements intelligent retry logic with alternative approaches
 */

import { executeTool } from '../tools/index.js';

export class SmartRetry {
  constructor(maxAttempts = 3) {
    this.maxAttempts = maxAttempts;
    this.retryStrategies = {
      'file_not_found': this.handleFileNotFound,
      'permission_denied': this.handlePermissionDenied,
      'directory_not_exist': this.handleDirectoryNotExist,
      'syntax_error': this.handleSyntaxError,
      'command_not_found': this.handleCommandNotFound,
      'module_not_found': this.handleModuleNotFound,
      'test_failure': this.handleTestFailure
    };
  }

  /**
   * Analyze error and determine retry strategy
   */
  analyzeError(error) {
    const errorStr = error.message || error.toString();
    const errorLower = errorStr.toLowerCase();

    if (errorLower.includes('no such file') || errorLower.includes('enoent')) {
      return 'file_not_found';
    }
    if (errorLower.includes('permission denied') || errorLower.includes('eacces')) {
      return 'permission_denied';
    }
    if (errorLower.includes('no such directory')) {
      return 'directory_not_exist';
    }
    if (errorLower.includes('syntax error') || errorLower.includes('unexpected token')) {
      return 'syntax_error';
    }
    if (errorLower.includes('command not found')) {
      return 'command_not_found';
    }
    if (errorLower.includes('cannot find module') || errorLower.includes('module not found')) {
      return 'module_not_found';
    }
    if (errorLower.includes('test failed') || errorLower.includes('assertion error')) {
      return 'test_failure';
    }

    return 'unknown';
  }

  /**
   * Execute with smart retry
   */
  async executeWithRetry(toolName, params, context) {
    let lastError = null;
    const attempts = [];

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        // Try the original operation
        const result = await executeTool(toolName, params, context);

        // Check if result indicates success
        if (this.isSuccessfulResult(result)) {
          return {
            success: true,
            result,
            attempts: attempt,
            history: attempts
          };
        }

        // Result doesn't look successful, treat as error
        throw new Error('Operation completed but result appears invalid');
      } catch (error) {
        lastError = error;
        const errorType = this.analyzeError(error);

        attempts.push({
          attempt,
          error: error.message,
          errorType,
          timestamp: new Date()
        });

        // If we have a strategy for this error type, try it
        if (attempt < this.maxAttempts && this.retryStrategies[errorType]) {
          console.log(`Attempt ${attempt} failed. Trying recovery strategy for: ${errorType}`);

          try {
            const recovered = await this.retryStrategies[errorType].call(
              this,
              error,
              toolName,
              params,
              context
            );

            if (recovered) {
              // Recovery succeeded, try original operation again
              continue;
            }
          } catch (recoveryError) {
            console.log(`Recovery strategy failed: ${recoveryError.message}`);
          }
        }

        // Try alternative approaches based on the tool
        if (attempt < this.maxAttempts) {
          const alternative = await this.tryAlternativeApproach(
            toolName,
            params,
            context,
            error
          );

          if (alternative && alternative.success) {
            return {
              success: true,
              result: alternative.result,
              attempts: attempt + 1,
              history: attempts,
              alternative: true
            };
          }
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError,
      attempts: this.maxAttempts,
      history: attempts
    };
  }

  /**
   * Check if a result indicates success
   */
  isSuccessfulResult(result) {
    if (!result) return false;

    // Check for explicit error indicators
    if (result.error || result.failed) return false;

    // Check for content
    if (result.text !== undefined || result.content !== undefined) {
      return true;
    }

    // For bash commands, check exit code if available
    if (result.exitCode !== undefined) {
      return result.exitCode === 0;
    }

    return true;
  }

  /**
   * Try alternative approach based on tool type
   */
  async tryAlternativeApproach(toolName, params, context, error) {
    console.log(`Trying alternative approach for ${toolName}...`);

    switch (toolName) {
      case 'Write':
        // If write fails, try creating directory first
        return await this.alternativeWrite(params, context);

      case 'Edit':
        // If edit fails, try reading first then rewriting
        return await this.alternativeEdit(params, context);

      case 'Bash':
        // If bash fails, try alternative commands
        return await this.alternativeBash(params, context);

      case 'Read':
        // If read fails, try using bash cat
        return await this.alternativeRead(params, context);

      default:
        return null;
    }
  }

  /**
   * Recovery strategies for specific error types
   */
  async handleFileNotFound(error, toolName, params, context) {
    console.log('Handling file not found error...');

    // If trying to read/edit a file that doesn't exist
    if (toolName === 'Read' || toolName === 'Edit') {
      // Check if we have the wrong path
      const glob = await executeTool('Glob',
        { pattern: `**/${params.file_path.split('/').pop()}` },
        context
      );

      if (glob && glob.text) {
        const files = glob.text.split('\n').filter(f => f.trim());
        if (files.length === 1) {
          console.log(`Found file at: ${files[0]}`);
          params.file_path = files[0];
          return true;
        }
      }
    }

    return false;
  }

  async handleDirectoryNotExist(error, toolName, params, context) {
    console.log('Creating missing directory...');

    if (toolName === 'Write' && params.file_path) {
      const dir = params.file_path.substring(0, params.file_path.lastIndexOf('/'));
      if (dir) {
        await executeTool('Bash',
          { command: `mkdir -p "${dir}"` },
          context
        );
        return true;
      }
    }

    return false;
  }

  async handlePermissionDenied(error, toolName, params, context) {
    console.log('Handling permission denied...');

    // Try with sudo if appropriate
    if (toolName === 'Bash' && !params.command.startsWith('sudo')) {
      console.log('Retrying with sudo...');
      params.command = `sudo ${params.command}`;
      return true;
    }

    return false;
  }

  async handleSyntaxError(error, toolName, params, context) {
    console.log('Handling syntax error...');

    // For code files, try to fix common syntax issues
    if (toolName === 'Write' && params.content) {
      // Try to fix common issues
      params.content = this.fixCommonSyntaxIssues(params.content);
      return true;
    }

    return false;
  }

  async handleCommandNotFound(error, toolName, params, context) {
    console.log('Handling command not found...');

    if (toolName === 'Bash') {
      // Try to find alternative command
      const alternatives = this.getCommandAlternatives(params.command);
      if (alternatives.length > 0) {
        params.command = alternatives[0];
        return true;
      }
    }

    return false;
  }

  async handleModuleNotFound(error, toolName, params, context) {
    console.log('Installing missing module...');

    const match = error.message.match(/Cannot find module '([^']+)'/);
    if (match && match[1]) {
      const module = match[1];
      await executeTool('Bash',
        { command: `npm install ${module}` },
        context
      );
      return true;
    }

    return false;
  }

  async handleTestFailure(error, toolName, params, context) {
    console.log('Analyzing test failure...');

    // Get more detailed test output
    if (toolName === 'Bash' && params.command.includes('test')) {
      // Add verbose flag if not present
      if (!params.command.includes('--verbose') && !params.command.includes('-v')) {
        params.command = params.command.replace('npm test', 'npm test -- --verbose');
        return true;
      }
    }

    return false;
  }

  /**
   * Alternative approaches for specific tools
   */
  async alternativeWrite(params, context) {
    try {
      // Try using bash echo instead
      const content = params.content.replace(/"/g, '\\"').replace(/\$/g, '\\$');
      const result = await executeTool('Bash',
        { command: `cat > "${params.file_path}" << 'EOF'\n${params.content}\nEOF` },
        context
      );

      return { success: true, result };
    } catch (error) {
      return null;
    }
  }

  async alternativeEdit(params, context) {
    try {
      // Read the file first
      const readResult = await executeTool('Read',
        { file_path: params.file_path },
        context
      );

      if (readResult && readResult.text) {
        // Replace content manually
        const content = readResult.text
          .replace(/^\d+→/gm, '')
          .replace(params.old_string, params.new_string);

        // Write back
        const writeResult = await executeTool('Write',
          { file_path: params.file_path, content },
          context
        );

        return { success: true, result: writeResult };
      }
    } catch (error) {
      return null;
    }
  }

  async alternativeBash(params, context) {
    // Try alternative commands for common operations
    const alternatives = this.getCommandAlternatives(params.command);

    for (const altCommand of alternatives) {
      try {
        const result = await executeTool('Bash',
          { command: altCommand },
          context
        );

        if (this.isSuccessfulResult(result)) {
          return { success: true, result };
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  async alternativeRead(params, context) {
    try {
      // Try using bash cat
      const result = await executeTool('Bash',
        { command: `cat "${params.file_path}"` },
        context
      );

      return { success: true, result };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get alternative commands
   */
  getCommandAlternatives(command) {
    const alternatives = [];

    // Common alternatives
    if (command.includes('python3')) {
      alternatives.push(command.replace('python3', 'python'));
    } else if (command.includes('python')) {
      alternatives.push(command.replace('python', 'python3'));
    }

    if (command.includes('node')) {
      alternatives.push(command.replace('node', 'nodejs'));
    }

    if (command.includes('npm')) {
      alternatives.push(command.replace('npm', 'yarn'));
    }

    return alternatives;
  }

  /**
   * Fix common syntax issues
   */
  fixCommonSyntaxIssues(content) {
    // Fix missing semicolons in JavaScript
    if (content.includes('function') || content.includes('const')) {
      content = content.replace(/^(\s*)(let|const|var)\s+(.+)$/gm, '$1$2 $3;');
    }

    // Fix unclosed brackets
    const openBrackets = (content.match(/{/g) || []).length;
    const closeBrackets = (content.match(/}/g) || []).length;
    if (openBrackets > closeBrackets) {
      content += '\n}'.repeat(openBrackets - closeBrackets);
    }

    return content;
  }
}