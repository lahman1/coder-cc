/**
 * Work Verification System
 * Automatically verifies actions to ensure quality
 */

import { executeTool } from '../tools/index.js';
import { readFileSync, existsSync } from 'fs';

export class WorkVerifier {
  constructor(context = {}) {
    this.context = context;
    this.verificationLog = [];
  }

  /**
   * Verify a file write operation
   */
  async verifyFileWrite(filePath, expectedContent) {
    const verification = {
      action: 'write',
      file: filePath,
      success: false,
      issues: []
    };

    try {
      // Check file exists
      if (!existsSync(filePath)) {
        verification.issues.push('File does not exist after write');
        this.verificationLog.push(verification);
        return verification;
      }

      // Read the file back
      const result = await executeTool('Read',
        { file_path: filePath },
        this.context
      );

      if (!result || !result.text) {
        verification.issues.push('Could not read file back');
      } else {
        // Check content matches (roughly)
        const actualContent = result.text.replace(/^\d+→/gm, '').trim();

        if (expectedContent) {
          // Basic content verification
          const expectedLines = expectedContent.trim().split('\n').length;
          const actualLines = actualContent.split('\n').length;

          if (Math.abs(expectedLines - actualLines) > 5) {
            verification.issues.push(`Line count mismatch: expected ~${expectedLines}, got ${actualLines}`);
          }

          // Check for TODO/FIXME in code files
          if (filePath.match(/\.(js|py|java|cpp|go|rs)$/)) {
            if (actualContent.includes('TODO') || actualContent.includes('FIXME')) {
              verification.issues.push('File contains TODO/FIXME placeholders');
            }
            if (actualContent.includes('// implement this') ||
                actualContent.includes('# implement this')) {
              verification.issues.push('File contains unimplemented sections');
            }
          }
        }

        verification.success = verification.issues.length === 0;
      }
    } catch (error) {
      verification.issues.push(`Verification error: ${error.message}`);
    }

    this.verificationLog.push(verification);
    return verification;
  }

  /**
   * Verify a file edit operation
   */
  async verifyFileEdit(filePath, oldString, newString) {
    const verification = {
      action: 'edit',
      file: filePath,
      success: false,
      issues: []
    };

    try {
      // Read the file to check edit was applied
      const result = await executeTool('Read',
        { file_path: filePath },
        this.context
      );

      if (!result || !result.text) {
        verification.issues.push('Could not read file after edit');
      } else {
        const content = result.text;

        // Check old string is gone
        if (content.includes(oldString)) {
          verification.issues.push('Old string still present in file');
        }

        // Check new string is present
        if (!content.includes(newString)) {
          verification.issues.push('New string not found in file');
        }

        verification.success = verification.issues.length === 0;
      }
    } catch (error) {
      verification.issues.push(`Verification error: ${error.message}`);
    }

    this.verificationLog.push(verification);
    return verification;
  }

  /**
   * Verify command execution
   */
  async verifyCommand(command, expectedPattern = null) {
    const verification = {
      action: 'command',
      command: command,
      success: false,
      issues: []
    };

    try {
      const result = await executeTool('Bash',
        { command },
        this.context
      );

      if (!result) {
        verification.issues.push('No output from command');
      } else if (result.text && result.text.includes('error')) {
        verification.issues.push('Command output contains errors');
      } else if (expectedPattern && !result.text.match(expectedPattern)) {
        verification.issues.push(`Output doesn't match expected pattern: ${expectedPattern}`);
      } else {
        verification.success = true;
      }
    } catch (error) {
      verification.issues.push(`Command failed: ${error.message}`);
    }

    this.verificationLog.push(verification);
    return verification;
  }

  /**
   * Verify tests pass
   */
  async verifyTests(testCommand = 'npm test') {
    const verification = {
      action: 'tests',
      command: testCommand,
      success: false,
      issues: []
    };

    try {
      const result = await executeTool('Bash',
        { command: testCommand },
        this.context
      );

      if (!result || !result.text) {
        verification.issues.push('No test output');
      } else {
        const output = result.text.toLowerCase();

        if (output.includes('failed') || output.includes('error')) {
          verification.issues.push('Tests are failing');
        } else if (output.includes('passed') || output.includes('success')) {
          verification.success = true;
        } else {
          verification.issues.push('Could not determine test status');
        }
      }
    } catch (error) {
      verification.issues.push(`Test execution failed: ${error.message}`);
    }

    this.verificationLog.push(verification);
    return verification;
  }

  /**
   * Verify code quality
   */
  async verifyCodeQuality(filePath) {
    const verification = {
      action: 'quality',
      file: filePath,
      success: false,
      issues: []
    };

    try {
      const content = readFileSync(filePath, 'utf-8');

      // Check for common quality issues
      const lines = content.split('\n');

      // Check for very long lines
      const longLines = lines.filter(l => l.length > 120).length;
      if (longLines > 5) {
        verification.issues.push(`${longLines} lines exceed 120 characters`);
      }

      // Check for console.log in production code
      if (!filePath.includes('test') && !filePath.includes('debug')) {
        const debugLines = lines.filter(l =>
          l.includes('console.log') || l.includes('print(')
        ).length;
        if (debugLines > 0) {
          verification.issues.push(`${debugLines} debug statements found`);
        }
      }

      // Check for proper error handling
      if (filePath.match(/\.(js|ts)$/)) {
        const hasTryCatch = content.includes('try {') && content.includes('catch');
        const hasPromiseCatch = content.includes('.catch(');
        if (!hasTryCatch && !hasPromiseCatch && content.includes('async ')) {
          verification.issues.push('Async code without error handling');
        }
      }

      verification.success = verification.issues.length === 0;
    } catch (error) {
      verification.issues.push(`Quality check failed: ${error.message}`);
    }

    this.verificationLog.push(verification);
    return verification;
  }

  /**
   * Get verification summary
   */
  getSummary() {
    const total = this.verificationLog.length;
    const successful = this.verificationLog.filter(v => v.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
      log: this.verificationLog
    };
  }

  /**
   * Get recommendations for improvements
   */
  getRecommendations() {
    const recommendations = [];
    const failedVerifications = this.verificationLog.filter(v => !v.success);

    for (const verification of failedVerifications) {
      if (verification.issues.includes('TODO/FIXME placeholders')) {
        recommendations.push({
          file: verification.file,
          action: 'Complete implementation',
          reason: 'File contains placeholder code'
        });
      }

      if (verification.issues.includes('Tests are failing')) {
        recommendations.push({
          action: 'Fix failing tests',
          reason: 'Tests must pass before continuing'
        });
      }

      if (verification.issues.some(i => i.includes('error handling'))) {
        recommendations.push({
          file: verification.file,
          action: 'Add error handling',
          reason: 'Missing proper error handling'
        });
      }
    }

    return recommendations;
  }
}