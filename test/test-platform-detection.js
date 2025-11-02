/**
 * Tests for platform detection
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runTests() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  console.log('  Testing platform detection...');

  // Load CLI source to test getPlatformInfo function
  const cliSource = readFileSync(join(__dirname, '..', 'src', 'cli.js'), 'utf-8');

  // Test 1: Platform detection function exists
  try {
    if (cliSource.includes('function getPlatformInfo()')) {
      console.log('    ✅ Platform detection function exists');
      results.passed.push({ test: 'Platform function exists' });
    } else {
      throw new Error('getPlatformInfo function not found');
    }
  } catch (error) {
    console.log('    ❌ Platform function test failed:', error.message);
    results.failed.push({ test: 'Platform function exists', error: error.message });
  }
  results.total++;

  // Test 2: Platform-specific configurations
  try {
    const hasWindows = cliSource.includes("'win32':");
    const hasMacOS = cliSource.includes("'darwin':");
    const hasLinux = cliSource.includes("'linux':");

    if (hasWindows && hasMacOS && hasLinux) {
      console.log('    ✅ All platform configurations present');
      results.passed.push({ test: 'Platform configurations' });
    } else {
      throw new Error('Missing platform configurations');
    }
  } catch (error) {
    console.log('    ❌ Platform configurations test failed:', error.message);
    results.failed.push({ test: 'Platform configurations', error: error.message });
  }
  results.total++;

  // Test 3: Current platform detection
  try {
    const platform = process.platform;
    const validPlatforms = ['win32', 'darwin', 'linux', 'freebsd', 'sunos'];

    if (validPlatforms.includes(platform)) {
      console.log(`    ✅ Current platform detected: ${platform}`);
      results.passed.push({ test: 'Current platform detection' });
    } else {
      throw new Error(`Unknown platform: ${platform}`);
    }
  } catch (error) {
    console.log('    ❌ Current platform test failed:', error.message);
    results.failed.push({ test: 'Current platform detection', error: error.message });
  }
  results.total++;

  // Test 4: System prompt includes platform info
  try {
    if (cliSource.includes('SYSTEM INFORMATION:') &&
        cliSource.includes('Operating System:') &&
        cliSource.includes('Shell Type:')) {
      console.log('    ✅ System prompt includes platform info');
      results.passed.push({ test: 'System prompt platform info' });
    } else {
      throw new Error('System prompt missing platform info');
    }
  } catch (error) {
    console.log('    ❌ System prompt test failed:', error.message);
    results.failed.push({ test: 'System prompt platform info', error: error.message });
  }
  results.total++;

  // Test 5: Platform-specific command examples
  try {
    const hasCreateDir = cliSource.includes('createDir:');
    const hasListFiles = cliSource.includes('listFiles:');
    const hasRemoveFile = cliSource.includes('removeFile:');

    if (hasCreateDir && hasListFiles && hasRemoveFile) {
      console.log('    ✅ Platform-specific command examples present');
      results.passed.push({ test: 'Platform command examples' });
    } else {
      throw new Error('Missing platform command examples');
    }
  } catch (error) {
    console.log('    ❌ Platform command test failed:', error.message);
    results.failed.push({ test: 'Platform command examples', error: error.message });
  }
  results.total++;

  return results;
}