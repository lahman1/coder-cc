/**
 * Tests for session management
 */

import { Session } from '../src/session.js';
import { existsSync, unlinkSync } from 'fs';
import { config } from '../src/config.js';

export async function runTests() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  console.log('  Testing session management...');

  // Test 1: Create new session
  try {
    const session = new Session();
    if (session.id && session.messages !== undefined && session.usage !== undefined) {
      console.log('    ✅ Session creation works');
      results.passed.push({ test: 'Session creation' });
    } else {
      throw new Error('Session missing required properties');
    }
  } catch (error) {
    console.log('    ❌ Session creation test failed:', error.message);
    results.failed.push({ test: 'Session creation', error: error.message });
  }
  results.total++;

  // Test 2: Add message to session
  try {
    const session = new Session();
    const testMessage = { role: 'user', content: 'Test message' };
    session.addMessage(testMessage);

    if (session.messages.length === 1 && session.messages[0].content === 'Test message') {
      console.log('    ✅ Message addition works');
      results.passed.push({ test: 'Add message' });
    } else {
      throw new Error('Message not added correctly');
    }
  } catch (error) {
    console.log('    ❌ Add message test failed:', error.message);
    results.failed.push({ test: 'Add message', error: error.message });
  }
  results.total++;

  // Test 3: Update usage statistics
  try {
    const session = new Session();
    session.updateUsage({
      input_tokens: 100,
      output_tokens: 50,
      compute_time: 1000
    });

    if (session.usage.inputTokens === 100 &&
        session.usage.outputTokens === 50 &&
        session.usage.computeTime === 1000) {
      console.log('    ✅ Usage statistics update works');
      results.passed.push({ test: 'Update usage' });
    } else {
      throw new Error('Usage statistics not updated correctly');
    }
  } catch (error) {
    console.log('    ❌ Update usage test failed:', error.message);
    results.failed.push({ test: 'Update usage', error: error.message });
  }
  results.total++;

  // Test 4: Save and load session
  let testSessionId = null;
  try {
    const session = new Session();
    testSessionId = session.id;
    session.addMessage({ role: 'user', content: 'Test save/load' });
    session.save();

    const sessionPath = config.getSessionPath(session.id);
    if (existsSync(sessionPath)) {
      const loadedSession = Session.load(session.id);
      if (loadedSession.messages.length === 1 &&
          loadedSession.messages[0].content === 'Test save/load') {
        console.log('    ✅ Session save/load works');
        results.passed.push({ test: 'Session save/load' });
      } else {
        throw new Error('Loaded session data mismatch');
      }
    } else {
      throw new Error('Session file not created');
    }
  } catch (error) {
    console.log('    ❌ Session save/load test failed:', error.message);
    results.failed.push({ test: 'Session save/load', error: error.message });
  } finally {
    // Clean up test session file
    if (testSessionId) {
      try {
        const sessionPath = config.getSessionPath(testSessionId);
        if (existsSync(sessionPath)) {
          unlinkSync(sessionPath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  results.total++;

  // Test 5: Get session summary
  try {
    const session = new Session();
    session.addMessage({ role: 'user', content: 'Test 1' });
    session.addMessage({ role: 'assistant', content: 'Response 1' });

    const summary = session.getSummary();
    if (summary.id === session.id &&
        summary.messageCount === 2 &&
        summary.usage !== undefined) {
      console.log('    ✅ Session summary works');
      results.passed.push({ test: 'Session summary' });
    } else {
      throw new Error('Invalid session summary');
    }
  } catch (error) {
    console.log('    ❌ Session summary test failed:', error.message);
    results.failed.push({ test: 'Session summary', error: error.message });
  }
  results.total++;

  return results;
}