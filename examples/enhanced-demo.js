#!/usr/bin/env node
/**
 * Enhanced Mode Demonstration
 * Shows how enhanced features improve task completion
 */

import { queryEnhanced } from '../src/sdk-enhanced.mjs';
import { getEnhancedSystemPrompt } from '../src/prompts/enhanced-system-prompt.js';

console.log(`
╔════════════════════════════════════════════════════════════╗
║         LC-Coder Enhanced Mode Demonstration              ║
╚════════════════════════════════════════════════════════════╝

This demo shows how enhanced mode improves task completion:
1. Strong task completion focus
2. Automatic work verification
3. Smart retry on failures
4. Better error recovery

`);

const tasks = [
  {
    name: "File Creation with Verification",
    prompt: "Create a file called demo-output.txt with the content 'Enhanced mode works great!'"
  },
  {
    name: "Error Recovery Demo",
    prompt: "Try to edit a file that doesn't exist at /nonexistent/file.txt, then handle the error gracefully"
  },
  {
    name: "Multi-step Task",
    prompt: "Create a simple JavaScript function that calculates factorial, save it to factorial.js, then verify it works by running it"
  }
];

async function runDemo() {
  for (const task of tasks) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TASK: ${task.name}`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Prompt: ${task.prompt}\n`);

    const platformInfo = {
      name: 'Demo Platform',
      shellType: 'bash',
      pathSeparator: '/',
      examples: {
        createDir: 'mkdir -p',
        listFiles: 'ls -la',
        removeFile: 'rm'
      },
      note: 'Standard Unix commands'
    };

    try {
      const messages = [
        { role: 'system', content: getEnhancedSystemPrompt(platformInfo) },
        { role: 'user', content: task.prompt }
      ];

      let toolsUsed = [];
      let verificationsPerformed = 0;
      let retriesNeeded = 0;

      console.log('Processing with enhanced mode...\n');

      for await (const event of queryEnhanced({
        messages,
        useEnhancedMode: true,
        autoVerify: true,
        smartRetry: true,
        platformInfo
      })) {
        switch (event.type) {
          case 'stream_event':
            if (event.event?.type === 'content_block_delta' && event.event.delta?.text) {
              process.stdout.write(event.event.delta.text);
            }
            break;

          case 'tool_result':
            toolsUsed.push(event.tool);
            console.log(`\n✓ Tool used: ${event.tool}`);
            break;

          case 'verification_warning':
            verificationsPerformed++;
            console.log(`\n⚠️ Verification: ${event.issues.join(', ')}`);
            break;

          case 'retry_info':
            retriesNeeded++;
            console.log(`\n🔄 Retry successful after ${event.attempts} attempts`);
            break;

          case 'recommendations':
            console.log('\n📋 Recommendations:');
            event.items.forEach(rec => {
              console.log(`   - ${rec.action}: ${rec.reason}`);
            });
            break;

          case 'verification_summary':
            console.log(`\n📊 Verification Summary:`);
            console.log(`   - Success rate: ${event.summary.successRate}%`);
            console.log(`   - Checks performed: ${event.summary.total}`);
            break;

          case 'error':
            console.error(`\n❌ Error: ${event.message}`);
            break;
        }
      }

      console.log(`\n\n📈 Task Statistics:`);
      console.log(`   - Tools used: ${toolsUsed.length} (${toolsUsed.join(', ')})`);
      console.log(`   - Verifications: ${verificationsPerformed}`);
      console.log(`   - Retries needed: ${retriesNeeded}`);

    } catch (error) {
      console.error(`\nTask failed: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('DEMONSTRATION COMPLETE');
  console.log(`${'='.repeat(60)}\n`);

  console.log(`
Key Benefits of Enhanced Mode:

✅ Task Completion Focus
   - Never just explains, always does the work
   - Uses tools actively to make real changes

✅ Automatic Verification
   - Checks files after writing
   - Verifies edits were applied
   - Validates command outputs

✅ Smart Retry Logic
   - Analyzes errors and tries different approaches
   - Creates missing directories automatically
   - Finds alternative commands when needed

✅ Better User Experience
   - Clear progress indicators
   - Detailed error messages
   - Actionable recommendations

Enhanced mode helps local LLMs achieve results closer to
Claude Code by providing structure, verification, and recovery!
`);
}

// Check if Ollama is running first
import { healthCheck } from '../src/sdk.mjs';

console.log('Checking Ollama connection...');
const isHealthy = await healthCheck();

if (!isHealthy) {
  console.error('\n❌ Ollama is not running!');
  console.log('Please start Ollama with: ollama serve\n');
  process.exit(1);
}

console.log('✓ Ollama connected\n');

// Run the demonstration
runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});