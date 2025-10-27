#!/usr/bin/env node

/**
 * Claude Code Local CLI
 * Interactive CLI for local LLM using Ollama
 */

import { query, healthCheck, listModels, config } from './sdk.mjs';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const SYSTEM_PROMPT = `You are Claude, an AI assistant designed to help with coding tasks and general questions.
You have access to various tools to help you:
- Read, Write, Edit files
- Execute bash commands
- Search for files (Glob) and content (Grep)
- Fetch web content
- Manage todo lists

You are running locally using Ollama, not connected to Anthropic servers.
Think step-by-step and use tools when necessary to complete tasks.`;

async function main() {
  console.log('Claude Code Local - Using Ollama');
  console.log('================================\n');

  // Check if Ollama is running
  console.log('Checking Ollama connection...');
  const isHealthy = await healthCheck();

  if (!isHealthy) {
    console.error('ERROR: Cannot connect to Ollama!');
    console.error('Please make sure Ollama is running with: ollama serve');
    console.error(`Expected endpoint: ${config.get('ollamaEndpoint')}\n`);
    process.exit(1);
  }

  console.log('✓ Connected to Ollama\n');

  // List available models
  try {
    const models = await listModels();
    console.log('Available models:');
    models.forEach(model => {
      console.log(`  - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`);
    });
    console.log('');
  } catch (error) {
    console.error('Warning: Could not list models');
  }

  const currentModel = config.get('ollamaModel');
  console.log(`Using model: ${currentModel}`);
  console.log(`Config directory: ${config.configDir}\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Non-interactive mode: run single query
    const prompt = args.join(' ');
    await runQuery(prompt);
  } else {
    // Interactive mode
    await interactiveMode();
  }
}

/**
 * Run a single query
 */
async function runQuery(prompt) {
  console.log('User:', prompt);
  console.log('\nAssistant: ');

  let assistantResponse = '';

  try {
    for await (const event of query({
      prompt: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
      signal: AbortSignal.timeout(300000) // 5 minute timeout
    })) {
      if (event.type === 'stream_event') {
        // Show streaming text
        if (event.event.type === 'content_block_delta' && event.event.delta?.text) {
          process.stdout.write(event.event.delta.text);
          assistantResponse += event.event.delta.text;
        }
      } else if (event.type === 'tool_result') {
        console.log(`\n[Tool: ${event.tool}]`);
        if (event.result.text) {
          // Truncate long tool results
          const result = event.result.text.length > 500
            ? event.result.text.substring(0, 500) + '...'
            : event.result.text;
          console.log(result);
        }
        console.log('');
      } else if (event.type === 'error') {
        console.error('\nError:', event.message);
      } else if (event.type === 'session_end') {
        console.log(`\n\nSession ID: ${event.session.id}`);
        console.log(`Tokens - Input: ${event.session.usage.inputTokens}, Output: ${event.session.usage.outputTokens}`);
        console.log(`Compute time: ${(event.session.usage.computeTime / 1000).toFixed(2)}s`);
      }
    }

    console.log('\n');
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

/**
 * Interactive REPL mode
 */
async function interactiveMode() {
  console.log('Interactive mode - Type your questions or "exit" to quit\n');

  const rl = readline.createInterface({ input, output });
  const conversationHistory = [];

  // Add system prompt
  conversationHistory.push({
    role: 'system',
    content: SYSTEM_PROMPT
  });

  while (true) {
    try {
      const userInput = await rl.question('You: ');

      if (!userInput.trim()) {
        continue;
      }

      if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
        console.log('Goodbye!');
        rl.close();
        break;
      }

      // Special commands
      if (userInput.startsWith('/')) {
        await handleCommand(userInput, conversationHistory);
        continue;
      }

      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: userInput
      });

      console.log('\nAssistant: ');
      let assistantResponse = '';

      try {
        for await (const event of query({
          messages: conversationHistory,
          signal: AbortSignal.timeout(300000)
        })) {
          if (event.type === 'stream_event') {
            if (event.event.type === 'content_block_delta' && event.event.delta?.text) {
              process.stdout.write(event.event.delta.text);
              assistantResponse += event.event.delta.text;
            }
          } else if (event.type === 'tool_result') {
            console.log(`\n[Tool: ${event.tool}]`);
          } else if (event.type === 'error') {
            console.error('\nError:', event.message);
          }
        }

        // Add assistant response to history
        if (assistantResponse) {
          conversationHistory.push({
            role: 'assistant',
            content: assistantResponse
          });
        }

        console.log('\n');
      } catch (error) {
        console.error('\nError:', error.message);
      }
    } catch (error) {
      if (error.message.includes('closed')) {
        break;
      }
      console.error('Error:', error.message);
    }
  }
}

/**
 * Handle special commands
 */
async function handleCommand(command, history) {
  const parts = command.slice(1).split(' ');
  const cmd = parts[0];

  switch (cmd) {
    case 'help':
      console.log(`
Available commands:
  /help              - Show this help
  /models            - List available models
  /model <name>      - Switch to a different model
  /config            - Show current configuration
  /clear             - Clear conversation history
  /exit or exit      - Exit the program
`);
      break;

    case 'models':
      const models = await listModels();
      console.log('\nAvailable models:');
      models.forEach(model => {
        const current = model.name === config.get('ollamaModel') ? ' (current)' : '';
        console.log(`  - ${model.name}${current}`);
      });
      console.log('');
      break;

    case 'model':
      if (parts[1]) {
        config.set('ollamaModel', parts[1]);
        console.log(`Switched to model: ${parts[1]}\n`);
      } else {
        console.log(`Current model: ${config.get('ollamaModel')}\n`);
      }
      break;

    case 'config':
      console.log('\nCurrent configuration:');
      console.log(`  Ollama Endpoint: ${config.get('ollamaEndpoint')}`);
      console.log(`  Model: ${config.get('ollamaModel')}`);
      console.log(`  Temperature: ${config.get('temperature')}`);
      console.log(`  Max Tokens: ${config.get('maxTokens')}`);
      console.log(`  Config Dir: ${config.configDir}\n`);
      break;

    case 'clear':
      history.length = 1; // Keep only system prompt
      console.log('Conversation history cleared.\n');
      break;

    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Type /help for available commands\n');
  }
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
