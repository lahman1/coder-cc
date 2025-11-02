/**
 * Tests for configuration management
 */

import { config } from '../src/config.js';
import { existsSync } from 'fs';

export async function runTests() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  console.log('  Testing configuration...');

  // Test 1: Config directory exists
  try {
    if (existsSync(config.configDir)) {
      console.log('    ✅ Config directory exists');
      results.passed.push({ test: 'Config directory exists' });
    } else {
      throw new Error('Config directory does not exist');
    }
  } catch (error) {
    console.log('    ❌ Config directory test failed:', error.message);
    results.failed.push({ test: 'Config directory exists', error: error.message });
  }
  results.total++;

  // Test 2: Sessions directory exists
  try {
    if (existsSync(config.sessionsDir)) {
      console.log('    ✅ Sessions directory exists');
      results.passed.push({ test: 'Sessions directory exists' });
    } else {
      throw new Error('Sessions directory does not exist');
    }
  } catch (error) {
    console.log('    ❌ Sessions directory test failed:', error.message);
    results.failed.push({ test: 'Sessions directory exists', error: error.message });
  }
  results.total++;

  // Test 3: Default config values
  try {
    const defaults = config.getDefaults();
    if (defaults.ollamaEndpoint && defaults.ollamaModel) {
      console.log('    ✅ Default config values present');
      results.passed.push({ test: 'Default config values' });
    } else {
      throw new Error('Missing default config values');
    }
  } catch (error) {
    console.log('    ❌ Default config test failed:', error.message);
    results.failed.push({ test: 'Default config values', error: error.message });
  }
  results.total++;

  // Test 4: Get and set config values
  try {
    const testKey = 'testValue_' + Date.now();
    const testValue = 'test_' + Math.random();

    config.set(testKey, testValue);
    const retrieved = config.get(testKey);

    if (retrieved === testValue) {
      console.log('    ✅ Config get/set works');
      results.passed.push({ test: 'Config get/set' });
    } else {
      throw new Error(`Expected ${testValue}, got ${retrieved}`);
    }
  } catch (error) {
    console.log('    ❌ Config get/set test failed:', error.message);
    results.failed.push({ test: 'Config get/set', error: error.message });
  }
  results.total++;

  // Test 5: Session path generation
  try {
    const sessionId = 'test-session-123';
    const path = config.getSessionPath(sessionId);

    if (path.includes(sessionId) && path.endsWith('.json')) {
      console.log('    ✅ Session path generation works');
      results.passed.push({ test: 'Session path generation' });
    } else {
      throw new Error('Invalid session path format');
    }
  } catch (error) {
    console.log('    ❌ Session path test failed:', error.message);
    results.failed.push({ test: 'Session path generation', error: error.message });
  }
  results.total++;

  return results;
}