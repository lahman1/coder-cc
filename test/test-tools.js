/**
 * Tests for tools
 */

import { getToolDefinitions, executeTool } from '../src/tools/index.js';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function runTests() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  console.log('  Testing tools...');

  // Test 1: Get tool definitions
  try {
    const tools = getToolDefinitions();
    if (Array.isArray(tools) && tools.length > 0) {
      const hasRequiredTools = tools.some(t => t.name === 'Read') &&
                               tools.some(t => t.name === 'Write') &&
                               tools.some(t => t.name === 'Bash');
      if (hasRequiredTools) {
        console.log(`    ✅ Tool definitions loaded (${tools.length} tools)`);
        results.passed.push({ test: 'Tool definitions' });
      } else {
        throw new Error('Missing required tools');
      }
    } else {
      throw new Error('No tools found');
    }
  } catch (error) {
    console.log('    ❌ Tool definitions test failed:', error.message);
    results.failed.push({ test: 'Tool definitions', error: error.message });
  }
  results.total++;

  // Test 2: Execute Bash tool
  try {
    const result = await executeTool('Bash',
      { command: 'echo "Test output"' },
      { workingDirectory: process.cwd() }
    );

    if (result && result.text && result.text.includes('Test output')) {
      console.log('    ✅ Bash tool execution works');
      results.passed.push({ test: 'Bash tool' });
    } else {
      throw new Error('Bash output mismatch');
    }
  } catch (error) {
    console.log('    ❌ Bash tool test failed:', error.message);
    results.failed.push({ test: 'Bash tool', error: error.message });
  }
  results.total++;

  // Test 3: Execute Write tool
  const testFile = join(process.cwd(), 'test', 'test-write-output.txt');
  try {
    const result = await executeTool('Write',
      {
        file_path: testFile,
        content: 'Test write content'
      },
      { workingDirectory: process.cwd() }
    );

    if (existsSync(testFile)) {
      console.log('    ✅ Write tool execution works');
      results.passed.push({ test: 'Write tool' });
      // Clean up
      unlinkSync(testFile);
    } else {
      throw new Error('File not created');
    }
  } catch (error) {
    console.log('    ❌ Write tool test failed:', error.message);
    results.failed.push({ test: 'Write tool', error: error.message });
    // Clean up if file exists
    try {
      if (existsSync(testFile)) unlinkSync(testFile);
    } catch (e) {}
  }
  results.total++;

  // Test 4: Execute Read tool
  const readTestFile = join(process.cwd(), 'test', 'test-read-input.txt');
  try {
    // Create a test file to read
    writeFileSync(readTestFile, 'Test read content\nLine 2\nLine 3');

    const result = await executeTool('Read',
      { file_path: readTestFile },
      { workingDirectory: process.cwd() }
    );

    if (result && result.text && result.text.includes('Test read content')) {
      console.log('    ✅ Read tool execution works');
      results.passed.push({ test: 'Read tool' });
    } else {
      throw new Error('Read content mismatch');
    }
  } catch (error) {
    console.log('    ❌ Read tool test failed:', error.message);
    results.failed.push({ test: 'Read tool', error: error.message });
  } finally {
    // Clean up
    try {
      if (existsSync(readTestFile)) unlinkSync(readTestFile);
    } catch (e) {}
  }
  results.total++;

  // Test 5: Execute Glob tool
  try {
    const result = await executeTool('Glob',
      { pattern: 'test/*.js' },
      { workingDirectory: process.cwd() }
    );

    if (result && result.text && result.text.includes('test-')) {
      console.log('    ✅ Glob tool execution works');
      results.passed.push({ test: 'Glob tool' });
    } else {
      throw new Error('Glob results not found');
    }
  } catch (error) {
    console.log('    ❌ Glob tool test failed:', error.message);
    results.failed.push({ test: 'Glob tool', error: error.message });
  }
  results.total++;

  return results;
}