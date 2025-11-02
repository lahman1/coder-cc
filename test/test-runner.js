#!/usr/bin/env node

/**
 * Simple test runner for LC-Coder
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const testResults = {
  passed: [],
  failed: [],
  total: 0
};

// Test runner function
async function runTests() {
  console.log('\n🧪 LC-Coder Test Suite\n');
  console.log('=' .repeat(50));

  const tests = [
    './test-config.js',
    './test-session.js',
    './test-ollama-client.js',
    './test-tools.js',
    './test-platform-detection.js'
  ];

  for (const testFile of tests) {
    const testPath = join(process.cwd(), 'test', testFile.replace('./', ''));

    if (!existsSync(testPath)) {
      console.log(`⊘ Skipping ${testFile} (not found)`);
      continue;
    }

    try {
      console.log(`\n📝 Running ${testFile}...`);
      const testModule = await import(pathToFileURL(testPath).href);

      if (testModule.runTests) {
        const result = await testModule.runTests();
        testResults.total += result.total || 0;

        if (result.passed) {
          testResults.passed.push(...result.passed);
        }
        if (result.failed) {
          testResults.failed.push(...result.failed);
        }
      }
    } catch (error) {
      console.error(`❌ Error running ${testFile}:`, error.message);
      testResults.failed.push({
        test: testFile,
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Summary\n');
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`📋 Total: ${testResults.total}`);

  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(failure => {
      console.log(`  - ${failure.test}: ${failure.error || 'Test failed'}`);
    });
  }

  console.log('\n' + '=' .repeat(50));

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal test error:', error);
  process.exit(1);
});