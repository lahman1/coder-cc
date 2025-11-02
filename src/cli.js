#!/usr/bin/env node

/**
 * LC-Coder CLI
 * Interactive CLI for local LLM coding assistant using Ollama
 */

import { query, healthCheck, listModels, config, Session } from './sdk.mjs';
import { queryEnhanced } from './sdk-enhanced.mjs';
import { Orchestrator } from './orchestrator.js';
import { CodebaseIndexer } from './rag/indexer.js';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import os from 'os';

// Detect platform and provide appropriate command examples
function getPlatformInfo() {
  const platform = process.platform;
  const platformMap = {
    'win32': {
      name: 'Windows',
      shellType: 'PowerShell/CMD',
      pathSeparator: '\\',
      examples: {
        createDir: 'mkdir directory_name or New-Item -ItemType Directory -Path "path"',
        listFiles: 'dir or Get-ChildItem',
        removeFile: 'del file.txt or Remove-Item file.txt'
      },
      note: 'Use PowerShell commands or the Write tool to create files. Avoid Unix commands like mkdir -p, rm, etc.'
    },
    'darwin': {
      name: 'macOS',
      shellType: 'bash/zsh',
      pathSeparator: '/',
      examples: {
        createDir: 'mkdir -p directory_name',
        listFiles: 'ls -la',
        removeFile: 'rm file.txt'
      },
      note: 'Use standard Unix/bash commands.'
    },
    'linux': {
      name: 'Linux',
      shellType: 'bash',
      pathSeparator: '/',
      examples: {
        createDir: 'mkdir -p directory_name',
        listFiles: 'ls -la',
        removeFile: 'rm file.txt'
      },
      note: 'Use standard Unix/bash commands.'
    }
  };

  return platformMap[platform] || platformMap['linux'];
}

function buildSystemPrompt() {
  const platformInfo = getPlatformInfo();

  return `You are LC-Coder, a systematic coding assistant who COMPLETES tasks by delivering working code and files.

SYSTEM INFORMATION:
- Operating System: ${platformInfo.name} (${process.platform})
- Shell Type: ${platformInfo.shellType}
- Path Separator: ${platformInfo.pathSeparator}
- Working Directory: ${process.cwd()}

AVAILABLE TOOLS:
- Read, Write, Edit files
- Execute bash commands (${platformInfo.note})
- Search for files (Glob) and content (Grep)
- Fetch web content
- TodoWrite - Create and manage task checklists

WORKFLOW - Follow these stages for EVERY task:

STAGE 1: UNDERSTAND
- Use Glob to find relevant files (e.g., "**/*.test.js" for test files)
- Use Grep to search for specific code patterns
- Use Read to examine existing implementations
- Identify what exists and what's needed

STAGE 2: PLAN
- For complex tasks, use TodoWrite to create a checklist of ALL steps
- Break down the task into concrete, actionable items
- Example: "Write tests for WebSocket handling" becomes:
  [ ] Read existing WebSocket implementation
  [ ] Find current test files to understand conventions
  [ ] Identify missing test coverage
  [ ] Write test file with all test cases
  [ ] Verify tests follow project conventions

STAGE 3: EXECUTE
- Work through EVERY item in your plan
- Use Write tool to CREATE new files (test files, example code, implementations)
- Use Edit tool to MODIFY existing files
- Mark todos as completed as you finish each item
- DO NOT stop until ALL tasks are complete

STAGE 4: VERIFY (when applicable)
- Review what you created
- Ensure deliverables match the request
- Check that files are complete and working

CRITICAL RULES:
1. When asked to "write tests", "create code", "implement X", or "add files":
   → Your job is to CREATE the actual files using the Write tool
   → DO NOT just explain what should be in them
   → Generate complete, working, ready-to-use code

2. For multi-step tasks, ALWAYS use TodoWrite first to plan all steps

3. Complete ALL stages before finishing - do not stop after analysis

4. Use the Write tool for creating files - it's more reliable than bash commands

WORKFLOW EXAMPLES:

Example 1: "Write unit tests for the authentication module"
Stage 1: Read auth module, find existing test files
Stage 2: TodoWrite checklist: [Read auth.js, Find test conventions, Write test file]
Stage 3: Use Write tool to create complete test file with all test cases
Stage 4: Review test coverage

Example 2: "Create a JSON error handling example with tests"
Stage 1: Find error handling code, understand exception types
Stage 2: TodoWrite: [Create example.cpp, Create test.cpp, Update CMakeLists.txt]
Stage 3: Use Write tool to generate all 3 files with complete code
Stage 4: Verify files compile and demonstrate all error types

PLATFORM-SPECIFIC COMMANDS:
- Create directory: ${platformInfo.examples.createDir}
- List files: ${platformInfo.examples.listFiles}
- Remove file: ${platformInfo.examples.removeFile}

Remember: You are running locally using Ollama. Your value is in COMPLETING tasks and DELIVERING working code, not just explaining what should be done.`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

async function main() {
  console.log('LC-Coder - Local Coding Assistant');
  console.log('==================================\n');

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

  // Show platform information
  const platformInfo = getPlatformInfo();
  console.log(`Platform: ${platformInfo.name} (${process.platform})`);
  console.log(`Shell: ${platformInfo.shellType}\n`);

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
  console.log('Interactive mode - Type your questions or "exit" to quit');
  console.log('💡 Tip: Use /multiagent for complex coding tasks (experimental)\n');

  const rl = readline.createInterface({ input, output });
  const conversationHistory = [];
  let multiAgentMode = false;  // Track multi-agent mode
  let reviewerEnabled = false;  // Track reviewer agent
  let enhancedMode = config.get('enhancedMode') !== false;  // Enhanced mode on by default

  // Add system prompt
  conversationHistory.push({
    role: 'system',
    content: SYSTEM_PROMPT
  });

  while (true) {
    try {
      const userInput = await rl.question('You: ');
      const userInputLower = userInput.toLowerCase();

      if (!userInput.trim()) {
        continue;
      }

      if (userInputLower === 'exit' || userInputLower === 'quit') {
        console.log('Goodbye!');
        rl.close();
        break;
      }

      // Special commands
      if (userInput.startsWith('/')) {
        const result = await handleCommand(userInput, conversationHistory);
        if (result && result.multiAgentMode !== undefined) {
          multiAgentMode = result.multiAgentMode;
        }
        if (result && result.reviewerEnabled !== undefined) {
          reviewerEnabled = result.reviewerEnabled;
        }
        if (result && result.enhancedMode !== undefined) {
          enhancedMode = result.enhancedMode;
        }
        if (result && result.resumedSession) {
          // Session was resumed, history already updated by handleCommand
        }
        continue;
      }

      // Check if multi-agent mode is enabled
      if (multiAgentMode) {
        await runMultiAgent(userInput, reviewerEnabled);
        continue;
      }

      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: userInput
      });

      console.log('\nAssistant: ');
      if (enhancedMode) {
        console.log('(Enhanced mode active)\n');
      }
      let assistantResponse = '';

      try {
        const queryFunction = enhancedMode ? queryEnhanced : query;
        const queryOptions = {
          messages: conversationHistory,
          signal: AbortSignal.timeout(300000),
          useEnhancedMode: enhancedMode,
          autoVerify: enhancedMode,
          smartRetry: enhancedMode,
          platformInfo: getPlatformInfo()
        };

        for await (const event of queryFunction(queryOptions)) {
          if (event.type === 'stream_event') {
            if (event.event.type === 'content_block_delta' && event.event.delta?.text) {
              process.stdout.write(event.event.delta.text);
              assistantResponse += event.event.delta.text;
            }
          } else if (event.type === 'tool_result') {
            console.log(`\n[Tool: ${event.tool}]`);
          } else if (event.type === 'verification_warning') {
            console.log(`\n⚠️ Verification issues: ${event.issues.join(', ')}`);
          } else if (event.type === 'retry_info') {
            console.log(`\n🔄 Retry successful after ${event.attempts} attempts`);
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
 * List available sessions
 */
function listSessions() {
  const sessionsDir = config.getSessionsDir();
  try {
    const files = readdirSync(sessionsDir);
    const sessions = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const sessionId = file.replace('.json', '');
        const filePath = join(sessionsDir, file);
        const stats = statSync(filePath);

        try {
          const session = Session.load(sessionId);
          const messageCount = session.messages.length;
          const lastMessage = session.messages[session.messages.length - 1];
          return {
            id: sessionId,
            date: stats.mtime,
            messages: messageCount,
            lastActivity: lastMessage?.timestamp || stats.mtime.toISOString(),
            preview: lastMessage?.content?.substring(0, 50) || 'No messages'
          };
        } catch (err) {
          return {
            id: sessionId,
            date: stats.mtime,
            messages: 0,
            lastActivity: stats.mtime.toISOString(),
            preview: 'Unable to load session'
          };
        }
      })
      .sort((a, b) => b.date - a.date);

    return sessions;
  } catch (error) {
    return [];
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
  /sessions          - List saved sessions
  /resume <id>       - Resume a previous session
  /enhanced          - Enable enhanced mode (verification & retry)
  /basic             - Disable enhanced mode
  /multiagent        - Enable multi-agent mode (Explorer → Planner → Coder)
  /singleagent       - Disable multi-agent mode (default)
  /reviewer          - Enable reviewer agent (validation & auto-fixing)
  /noreviewer        - Disable reviewer agent (default)
  /index [path]      - Index codebase for RAG (requires ChromaDB running)
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

    case 'enhanced':
      console.log('✅ Enhanced mode ENABLED');
      console.log('Features: automatic verification, smart retry, and task completion focus\n');
      return { enhancedMode: true };

    case 'basic':
      console.log('✅ Enhanced mode DISABLED');
      console.log('Using basic mode without verification and retry\n');
      return { enhancedMode: false };

    case 'multiagent':
      console.log('✅ Multi-agent mode ENABLED');
      console.log('Next prompt will use: Explorer → Planner → Coder pipeline\n');
      return { multiAgentMode: true };

    case 'singleagent':
      console.log('✅ Multi-agent mode DISABLED');
      console.log('Returning to single-agent mode\n');
      return { multiAgentMode: false };

    case 'reviewer':
      console.log('✅ Reviewer agent ENABLED');
      console.log('Next multi-agent run will include validation & auto-fixing\n');
      return { reviewerEnabled: true };

    case 'noreviewer':
      console.log('✅ Reviewer agent DISABLED');
      console.log('Multi-agent will skip validation step\n');
      return { reviewerEnabled: false };

    case 'index':
      console.log('📚 Indexing codebase for RAG...');
      const indexPath = parts[1] || process.cwd();
      await indexCodebase(indexPath);
      break;

    case 'sessions':
      const sessions = listSessions();
      if (sessions.length === 0) {
        console.log('\nNo saved sessions found.\n');
      } else {
        console.log('\nSaved sessions:');
        console.log('─'.repeat(60));
        sessions.slice(0, 10).forEach(session => {
          const date = new Date(session.lastActivity);
          const dateStr = date.toLocaleString();
          console.log(`ID: ${session.id}`);
          console.log(`   Last: ${dateStr} | Messages: ${session.messages}`);
          console.log(`   Preview: ${session.preview}...`);
          console.log('─'.repeat(60));
        });
        if (sessions.length > 10) {
          console.log(`\n... and ${sessions.length - 10} more sessions`);
        }
        console.log('\nUse /resume <session-id> to resume a session\n');
      }
      break;

    case 'resume':
      const sessionId = parts[1];
      if (!sessionId) {
        console.log('Usage: /resume <session-id>');
        console.log('Use /sessions to list available sessions\n');
        break;
      }

      try {
        const session = Session.load(sessionId);
        console.log(`\nResuming session: ${sessionId}`);
        console.log(`Messages in session: ${session.messages.length}`);

        // Clear current history and replace with session history
        history.length = 0;
        session.messages.forEach(msg => {
          history.push({
            role: msg.role,
            content: msg.content
          });
        });

        // Ensure system prompt is at the beginning if not present
        if (history.length === 0 || history[0].role !== 'system') {
          history.unshift({
            role: 'system',
            content: SYSTEM_PROMPT
          });
        }

        console.log('Session resumed! Continue your conversation.\n');

        // Show last few messages for context
        const recentMessages = session.messages.slice(-3);
        if (recentMessages.length > 0) {
          console.log('Recent conversation:');
          console.log('─'.repeat(60));
          recentMessages.forEach(msg => {
            const preview = msg.content.substring(0, 200);
            console.log(`${msg.role.toUpperCase()}: ${preview}${msg.content.length > 200 ? '...' : ''}`);
          });
          console.log('─'.repeat(60) + '\n');
        }

        // Return session info to be used in interactive mode
        return { resumedSession: session };
      } catch (error) {
        console.log(`Error loading session: ${error.message}`);
        console.log('Use /sessions to list available sessions\n');
      }
      break;

    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Type /help for available commands\n');
  }
}

/**
 * Run multi-agent orchestrator
 */
async function runMultiAgent(userRequest, reviewerEnabled = false) {
  console.log('\n🤖 Launching multi-agent pipeline...\n');

  const orchestrator = new Orchestrator({
    maxRetries: 2,
    enableReviewer: reviewerEnabled
  });

  try {
    const results = await orchestrator.execute(userRequest);

    // Show summary
    const summary = orchestrator.getSummary(results);

    console.log('\n' + '='.repeat(60));
    console.log('PIPELINE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Success: ${summary.success ? '✅' : '❌'}`);
    console.log(`Stages completed: ${summary.stages_completed}/${summary.total_stages}`);

    if (summary.files_created && summary.files_created.length > 0) {
      console.log(`\nFiles created:`);
      summary.files_created.forEach(file => {
        console.log(`  ✓ ${file.path}`);
      });
    }

    if (summary.errors && summary.errors.length > 0) {
      console.log(`\nErrors:`);
      summary.errors.forEach(error => {
        console.log(`  ✗ ${error.stage}: ${error.error}`);
      });
    }

    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Multi-agent pipeline failed:');
    console.error(error.message);
    console.log('\n💡 Tip: Try /singleagent mode or simplify your request\n');
  }
}

/**
 * Index codebase for RAG
 */
async function indexCodebase(directoryPath) {
  try {
    console.log(`\n📂 Indexing directory: ${directoryPath}`);
    console.log('⚠️  Note: This requires ChromaDB to be running at http://localhost:8000');
    console.log('   Start with: source .venv/bin/activate && chroma run --host localhost --port 8000\n');

    const indexer = new CodebaseIndexer({
      chromaUrl: 'http://localhost:8000',
      collectionName: 'codebase'
    });

    // Initialize
    const initialized = await indexer.initialize();
    if (!initialized) {
      console.error('\n❌ Failed to initialize indexer. Make sure ChromaDB is running.\n');
      return;
    }

    // Index the directory
    const stats = await indexer.indexDirectory(directoryPath, {
      verbose: true,
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '__pycache__/**', '*.pyc']
    });

    console.log('\n✅ Indexing complete!');
    console.log(`   📊 Files indexed: ${stats.files_indexed}`);
    console.log(`   ⊘ Files skipped: ${stats.files_skipped}`);
    console.log(`   📦 Total chunks: ${stats.chunks_created}`);
    console.log('\n💡 Now you can use RAGQuery in agents to search the codebase semantically!\n');

  } catch (error) {
    console.error(`\n❌ Indexing failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 ChromaDB is not running. Start it with:');
      console.log('   source .venv/bin/activate');
      console.log('   chroma run --host localhost --port 8000\n');
    }
  }
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
