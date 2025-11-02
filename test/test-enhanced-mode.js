#!/usr/bin/env node
/**
 * Test enhanced mode features
 */

import { queryEnhanced, WorkVerifier, SmartRetry } from '../src/sdk-enhanced.mjs';
import { config } from '../src/config.js';

async function testEnhancedMode() {
  console.log('Testing Enhanced Mode Features\n');
  console.log('=' .repeat(50));

  // Test 1: Work Verifier
  console.log('\n1. Testing Work Verifier...');
  try {
    const verifier = new WorkVerifier({ workingDirectory: process.cwd() });

    // Test file write verification
    const writeVerification = await verifier.verifyFileWrite(
      '/tmp/test-verify.txt',
      'Test content'
    );

    console.log(`   File write verification: ${writeVerification.success ? '✅' : '❌'}`);
    if (writeVerification.issues.length > 0) {
      console.log(`   Issues: ${writeVerification.issues.join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Verifier test failed: ${error.message}`);
  }

  // Test 2: Smart Retry
  console.log('\n2. Testing Smart Retry...');
  try {
    const retry = new SmartRetry(3);

    // Test error analysis
    const errorTypes = [
      { error: new Error('No such file or directory'), expected: 'file_not_found' },
      { error: new Error('Permission denied'), expected: 'permission_denied' },
      { error: new Error('Syntax error'), expected: 'syntax_error' }
    ];

    let passed = 0;
    for (const test of errorTypes) {
      const result = retry.analyzeError(test.error);
      if (result === test.expected) {
        passed++;
      }
    }

    console.log(`   Error analysis: ${passed}/${errorTypes.length} passed`);
  } catch (error) {
    console.log(`   ❌ Retry test failed: ${error.message}`);
  }

  // Test 3: Enhanced Query (simple test)
  console.log('\n3. Testing Enhanced Query...');
  try {
    const testMessages = [
      { role: 'system', content: 'You are a test assistant' },
      { role: 'user', content: 'Say "test complete" and nothing else' }
    ];

    let responseReceived = false;

    for await (const event of queryEnhanced({
      messages: testMessages,
      useEnhancedMode: true,
      autoVerify: true,
      smartRetry: true
    })) {
      if (event.type === 'assistant') {
        responseReceived = true;
        console.log(`   Enhanced query response: ✅`);
        break;
      } else if (event.type === 'error') {
        console.log(`   ❌ Query error: ${event.message}`);
        break;
      }
    }

    if (!responseReceived) {
      console.log(`   ⚠️ No response received (Ollama may need more time)`);
    }
  } catch (error) {
    console.log(`   ❌ Enhanced query test failed: ${error.message}`);
  }

  // Test 4: Configuration
  console.log('\n4. Testing Configuration...');
  const enhancedEnabled = config.get('enhancedMode');
  const autoVerifyEnabled = config.get('autoVerify');
  const smartRetryEnabled = config.get('smartRetry');

  console.log(`   Enhanced Mode: ${enhancedEnabled ? '✅' : '❌'}`);
  console.log(`   Auto Verify: ${autoVerifyEnabled ? '✅' : '❌'}`);
  console.log(`   Smart Retry: ${smartRetryEnabled ? '✅' : '❌'}`);

  console.log('\n' + '=' .repeat(50));
  console.log('Enhanced Mode Test Complete!\n');
}

// Run the test
testEnhancedMode().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});