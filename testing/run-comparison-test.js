#!/usr/bin/env node
/**
 * Automated Testing Tool for LC-Coder vs Claude Code
 * Runs test scenarios and captures outputs for comparison
 */

import { query, queryEnhanced } from '../src/sdk-enhanced.mjs';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const TEST_SCENARIOS = {
  python_understanding: {
    repo: '/opt/repos/fastapi',
    prompt: 'Find all API endpoints in this FastAPI project and list them with their HTTP methods and paths',
    category: 'understanding'
  },
  python_modification: {
    repo: '/opt/repos/fastapi',
    prompt: 'Add a simple health check endpoint at /health that returns {"status": "ok"}',
    category: 'modification'
  },
  java_understanding: {
    repo: '/opt/repos/commons-lang',
    prompt: 'List all public methods in StringUtils class with their purposes',
    category: 'understanding'
  },
  java_testing: {
    repo: '/opt/repos/commons-lang',
    prompt: 'Write a unit test for StringUtils.capitalize() method covering edge cases',
    category: 'testing'
  },
  cpp_understanding: {
    repo: '/opt/repos/json',
    prompt: 'Explain how JSON parsing works in this library and identify the main parser class',
    category: 'understanding'
  },
  cpp_modification: {
    repo: '/opt/repos/json',
    prompt: 'Add a method to count the total number of keys in a JSON object recursively',
    category: 'modification'
  }
};

class TestRunner {
  constructor() {
    this.results = {};
    this.outputDir = join(process.cwd(), 'testing', 'outputs', new Date().toISOString().split('T')[0]);

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runTest(scenarioName, scenario, mode = 'enhanced') {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${scenarioName} (${mode} mode)`);
    console.log(`Repo: ${scenario.repo}`);
    console.log(`Category: ${scenario.category}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    const result = {
      scenario: scenarioName,
      mode,
      prompt: scenario.prompt,
      repo: scenario.repo,
      category: scenario.category,
      startTime: new Date().toISOString(),
      toolsUsed: [],
      retries: 0,
      verifications: 0,
      errors: [],
      output: '',
      metrics: {}
    };

    try {
      // Change to repo directory
      process.chdir(scenario.repo);

      const messages = [
        {
          role: 'system',
          content: `You are analyzing the codebase in ${scenario.repo}. Use tools to explore and complete the task.`
        },
        { role: 'user', content: scenario.prompt }
      ];

      const queryFunc = mode === 'enhanced' ? queryEnhanced : query;

      for await (const event of queryFunc({
        messages,
        useEnhancedMode: mode === 'enhanced',
        autoVerify: mode === 'enhanced',
        smartRetry: mode === 'enhanced'
      })) {
        switch (event.type) {
          case 'stream_event':
            if (event.event?.type === 'content_block_delta' && event.event.delta?.text) {
              result.output += event.event.delta.text;
              process.stdout.write(event.event.delta.text);
            }
            break;

          case 'tool_result':
            result.toolsUsed.push({
              tool: event.tool,
              input: event.input,
              timestamp: Date.now() - startTime
            });
            console.log(`\n[Tool: ${event.tool}]`);
            break;

          case 'retry_info':
            result.retries++;
            console.log(`\n🔄 Retry #${result.retries}`);
            break;

          case 'verification_warning':
            result.verifications++;
            break;

          case 'error':
            result.errors.push(event.message);
            console.error(`\n❌ Error: ${event.message}`);
            break;
        }
      }
    } catch (error) {
      result.errors.push(error.message);
      console.error(`\nTest failed: ${error.message}`);
    }

    // Calculate metrics
    const endTime = Date.now();
    result.metrics = {
      duration: endTime - startTime,
      toolCount: result.toolsUsed.length,
      outputLength: result.output.length,
      errorCount: result.errors.length,
      completed: result.errors.length === 0,
      retriesNeeded: result.retries,
      verificationsPerformed: result.verifications
    };

    // Save result
    const filename = `${scenarioName}_${mode}_${Date.now()}.json`;
    writeFileSync(
      join(this.outputDir, filename),
      JSON.stringify(result, null, 2)
    );

    console.log(`\n📊 Metrics:`);
    console.log(`  Duration: ${(result.metrics.duration / 1000).toFixed(2)}s`);
    console.log(`  Tools used: ${result.metrics.toolCount}`);
    console.log(`  Output length: ${result.metrics.outputLength} chars`);
    console.log(`  Errors: ${result.metrics.errorCount}`);
    console.log(`  Retries: ${result.metrics.retriesNeeded}`);

    return result;
  }

  async runComparison(scenarioName) {
    const scenario = TEST_SCENARIOS[scenarioName];
    if (!scenario) {
      console.error(`Unknown scenario: ${scenarioName}`);
      return;
    }

    console.log(`\n${'#'.repeat(60)}`);
    console.log(`COMPARISON TEST: ${scenarioName}`);
    console.log(`${'#'.repeat(60)}`);

    // Run with enhanced mode
    const enhancedResult = await this.runTest(scenarioName, scenario, 'enhanced');

    // Run with basic mode
    const basicResult = await this.runTest(scenarioName, scenario, 'basic');

    // Compare results
    this.compareResults(enhancedResult, basicResult);

    return { enhanced: enhancedResult, basic: basicResult };
  }

  compareResults(enhanced, basic) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('COMPARISON RESULTS');
    console.log(`${'='.repeat(60)}\n`);

    const comparison = {
      scenario: enhanced.scenario,
      enhanced: {
        duration: enhanced.metrics.duration,
        tools: enhanced.metrics.toolCount,
        output: enhanced.metrics.outputLength,
        errors: enhanced.metrics.errorCount,
        retries: enhanced.metrics.retriesNeeded,
        completed: enhanced.metrics.completed
      },
      basic: {
        duration: basic.metrics.duration,
        tools: basic.metrics.toolCount,
        output: basic.metrics.outputLength,
        errors: basic.metrics.errorCount,
        retries: basic.metrics.retriesNeeded,
        completed: basic.metrics.completed
      },
      improvements: {
        speedup: ((basic.metrics.duration - enhanced.metrics.duration) / basic.metrics.duration * 100).toFixed(1),
        moreTools: enhanced.metrics.toolCount - basic.metrics.toolCount,
        betterCompletion: enhanced.metrics.completed && !basic.metrics.completed,
        errorReduction: basic.metrics.errorCount - enhanced.metrics.errorCount
      }
    };

    console.log('Enhanced Mode:');
    console.log(`  ✅ Completed: ${enhanced.metrics.completed}`);
    console.log(`  ⏱️  Duration: ${(enhanced.metrics.duration / 1000).toFixed(2)}s`);
    console.log(`  🔧 Tools: ${enhanced.metrics.toolCount}`);
    console.log(`  📝 Output: ${enhanced.metrics.outputLength} chars`);
    console.log(`  🔄 Retries: ${enhanced.metrics.retriesNeeded}`);
    console.log(`  ❌ Errors: ${enhanced.metrics.errorCount}`);

    console.log('\nBasic Mode:');
    console.log(`  ✅ Completed: ${basic.metrics.completed}`);
    console.log(`  ⏱️  Duration: ${(basic.metrics.duration / 1000).toFixed(2)}s`);
    console.log(`  🔧 Tools: ${basic.metrics.toolCount}`);
    console.log(`  📝 Output: ${basic.metrics.outputLength} chars`);
    console.log(`  🔄 Retries: ${basic.metrics.retriesNeeded}`);
    console.log(`  ❌ Errors: ${basic.metrics.errorCount}`);

    console.log('\nImprovements with Enhanced Mode:');
    if (comparison.improvements.speedup > 0) {
      console.log(`  ⚡ ${comparison.improvements.speedup}% faster`);
    }
    if (comparison.improvements.moreTools > 0) {
      console.log(`  🔧 ${comparison.improvements.moreTools} more tools used`);
    }
    if (comparison.improvements.betterCompletion) {
      console.log(`  ✨ Task completed (basic mode failed)`);
    }
    if (comparison.improvements.errorReduction > 0) {
      console.log(`  🛡️  ${comparison.improvements.errorReduction} fewer errors`);
    }

    // Save comparison
    writeFileSync(
      join(this.outputDir, `comparison_${enhanced.scenario}.json`),
      JSON.stringify(comparison, null, 2)
    );
  }

  async runAllTests() {
    const results = {};

    for (const scenarioName of Object.keys(TEST_SCENARIOS)) {
      results[scenarioName] = await this.runComparison(scenarioName);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.generateReport(results);
    return results;
  }

  generateReport(allResults) {
    console.log(`\n${'#'.repeat(60)}`);
    console.log('FINAL REPORT');
    console.log(`${'#'.repeat(60)}\n`);

    let enhancedWins = 0;
    let basicWins = 0;
    let ties = 0;

    for (const [scenario, results] of Object.entries(allResults)) {
      const enhanced = results.enhanced.metrics;
      const basic = results.basic.metrics;

      // Determine winner based on completion and errors
      if (enhanced.completed && !basic.completed) {
        enhancedWins++;
      } else if (!enhanced.completed && basic.completed) {
        basicWins++;
      } else if (enhanced.errorCount < basic.errorCount) {
        enhancedWins++;
      } else if (enhanced.errorCount > basic.errorCount) {
        basicWins++;
      } else {
        ties++;
      }
    }

    console.log('Overall Results:');
    console.log(`  Enhanced Mode Wins: ${enhancedWins}`);
    console.log(`  Basic Mode Wins: ${basicWins}`);
    console.log(`  Ties: ${ties}`);

    console.log(`\nReports saved to: ${this.outputDir}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node run-comparison-test.js <scenario>  - Run specific test');
    console.log('  node run-comparison-test.js all         - Run all tests');
    console.log('\nAvailable scenarios:');
    Object.keys(TEST_SCENARIOS).forEach(name => {
      console.log(`  - ${name}`);
    });
    return;
  }

  if (args[0] === 'all') {
    await runner.runAllTests();
  } else {
    await runner.runComparison(args[0]);
  }
}

main().catch(console.error);