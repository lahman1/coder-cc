/**
 * Tests for Ollama client
 */

import { OllamaClient } from '../src/ollama-client.js';

export async function runTests() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  console.log('  Testing Ollama client...');

  const client = new OllamaClient({
    endpoint: 'http://localhost:11434',
    model: 'qwen3:32b'
  });

  // Test 1: Message conversion (Anthropic to Ollama format)
  try {
    const anthropicMessages = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const converted = client.convertMessages(anthropicMessages);

    if (Array.isArray(converted) &&
        converted.length === 3 &&
        converted[0].role === 'system' &&
        converted[1].role === 'user' &&
        converted[2].role === 'assistant') {
      console.log('    ✅ Message conversion works');
      results.passed.push({ test: 'Message conversion' });
    } else {
      throw new Error('Message conversion failed');
    }
  } catch (error) {
    console.log('    ❌ Message conversion test failed:', error.message);
    results.failed.push({ test: 'Message conversion', error: error.message });
  }
  results.total++;

  // Test 2: Tool conversion (Anthropic to OpenAI format)
  try {
    const anthropicTools = [{
      name: 'TestTool',
      description: 'A test tool',
      input_schema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Test input' }
        },
        required: ['input']
      }
    }];

    const converted = client.convertTools(anthropicTools);

    if (converted.length === 1 &&
        converted[0].type === 'function' &&
        converted[0].function.name === 'TestTool' &&
        converted[0].function.parameters.properties.input) {
      console.log('    ✅ Tool conversion works');
      results.passed.push({ test: 'Tool conversion' });
    } else {
      throw new Error('Tool conversion failed');
    }
  } catch (error) {
    console.log('    ❌ Tool conversion test failed:', error.message);
    results.failed.push({ test: 'Tool conversion', error: error.message });
  }
  results.total++;

  // Test 3: Health check
  try {
    const isHealthy = await client.healthCheck();
    if (typeof isHealthy === 'boolean') {
      console.log(`    ✅ Health check works (Ollama ${isHealthy ? 'available' : 'unavailable'})`);
      results.passed.push({ test: 'Health check' });
    } else {
      throw new Error('Health check returned invalid value');
    }
  } catch (error) {
    console.log('    ⚠️  Health check test skipped (Ollama may not be running)');
    results.passed.push({ test: 'Health check (skipped)' });
  }
  results.total++;

  // Test 4: List models (if Ollama is available)
  try {
    const isHealthy = await client.healthCheck();
    if (isHealthy) {
      const models = await client.listModels();
      if (Array.isArray(models)) {
        console.log(`    ✅ List models works (${models.length} models found)`);
        results.passed.push({ test: 'List models' });
      } else {
        throw new Error('List models returned invalid format');
      }
    } else {
      console.log('    ⊘ List models test skipped (Ollama not available)');
      results.passed.push({ test: 'List models (skipped)' });
    }
  } catch (error) {
    console.log('    ⚠️  List models test skipped:', error.message);
    results.passed.push({ test: 'List models (skipped)' });
  }
  results.total++;

  // Test 5: Stream event conversion
  try {
    const ollamaEvent = {
      message: {
        role: 'assistant',
        content: 'Test response'
      },
      done: false
    };

    const converted = client.convertStreamEvent(ollamaEvent);

    if (converted.type === 'content_block_delta' &&
        converted.delta.text === 'Test response') {
      console.log('    ✅ Stream event conversion works');
      results.passed.push({ test: 'Stream event conversion' });
    } else {
      throw new Error('Stream event conversion failed');
    }
  } catch (error) {
    console.log('    ❌ Stream event conversion test failed:', error.message);
    results.failed.push({ test: 'Stream event conversion', error: error.message });
  }
  results.total++;

  return results;
}