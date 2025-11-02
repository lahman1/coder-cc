#!/usr/bin/env node

/**
 * Performance Testing Script
 * Tests the optimized multi-agent system vs single-agent
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const TEST_CASES = [
  // Single-agent suitable (simple questions/commands)
  {
    name: 'Simple Question',
    prompt: 'What is a closure in JavaScript?',
    expectedMode: 'single-agent'
  },
  {
    name: 'Git Command',
    prompt: 'git status',
    expectedMode: 'single-agent'
  },
  {
    name: 'npm Command',
    prompt: 'npm list',
    expectedMode: 'single-agent'
  },

  // Multi-agent suitable (complex tasks)
  {
    name: 'File Creation',
    prompt: 'Create a hello world Python script',
    expectedMode: 'multi-agent'
  },
  {
    name: 'API Exploration',
    prompt: 'Find all API endpoints in the codebase',
    expectedMode: 'multi-agent'
  },
  {
    name: 'Refactoring',
    prompt: 'Refactor the authentication module to use JWT tokens',
    expectedMode: 'multi-agent'
  },

  // Force mode tests
  {
    name: 'Force Multi (Simple)',
    prompt: '--force-multi What is async?',
    expectedMode: 'multi-agent',
    forceMode: true
  },
  {
    name: 'Force Single (Complex)',
    prompt: '--force-single Create a REST API with CRUD operations',
    expectedMode: 'single-agent',
    forceMode: true
  }
];

async function runTest(testCase) {
  console.log(`\n[TEST] ${testCase.name}`);
  console.log(`Prompt: "${testCase.prompt}"`);
  console.log(`Expected: ${testCase.expectedMode}`);

  const startTime = Date.now();

  return new Promise((resolve) => {
    const child = spawn('npm', ['start', testCase.prompt], {
      cwd: '/opt/agent/coder-cc',
      shell: true
    });

    let output = '';
    let mode = 'unknown';
    let analysisResult = null;

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;

      // Detect mode from output
      if (text.includes('[INFO] Using multi-agent mode')) {
        mode = 'multi-agent';
      } else if (text.includes('[INFO] Using single-agent mode')) {
        mode = 'single-agent';
      } else if (text.includes('[INFO] Launching multi-agent pipeline')) {
        mode = 'multi-agent';
      }

      // Capture analysis result
      if (text.includes('[ANALYSIS]')) {
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.includes('Recommendation:')) {
            analysisResult = line;
          }
        }
      }
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Extract key metrics from output
      const metrics = extractMetrics(output);

      resolve({
        testCase: testCase.name,
        prompt: testCase.prompt,
        expectedMode: testCase.expectedMode,
        actualMode: mode,
        passed: mode === testCase.expectedMode || testCase.forceMode,
        duration: duration,
        analysisResult: analysisResult,
        metrics: metrics,
        exitCode: code
      });
    });

    // Kill after timeout
    setTimeout(() => {
      child.kill();
      resolve({
        testCase: testCase.name,
        prompt: testCase.prompt,
        expectedMode: testCase.expectedMode,
        actualMode: 'timeout',
        passed: false,
        duration: 60,
        error: 'Timeout after 60s'
      });
    }, 60000);
  });
}

function extractMetrics(output) {
  const metrics = {};

  // Extract token counts
  const tokenMatch = output.match(/Tokens - Input: (\d+), Output: (\d+)/);
  if (tokenMatch) {
    metrics.inputTokens = parseInt(tokenMatch[1]);
    metrics.outputTokens = parseInt(tokenMatch[2]);
  }

  // Extract compute time
  const computeMatch = output.match(/Compute time: ([\d.]+)s/);
  if (computeMatch) {
    metrics.computeTime = parseFloat(computeMatch[1]);
  }

  // Extract stages completed (multi-agent)
  const stagesMatch = output.match(/Stages completed: (\d+)\/(\d+)/);
  if (stagesMatch) {
    metrics.stagesCompleted = parseInt(stagesMatch[1]);
    metrics.totalStages = parseInt(stagesMatch[2]);
  }

  // Check for fallback
  metrics.fallbackUsed = output.includes('[FALLBACK]');

  // Check for errors
  metrics.hasErrors = output.includes('[FAILED]') || output.includes('[ERROR]');

  return metrics;
}

async function runAllTests() {
  console.log('====================================');
  console.log('Performance Testing Suite');
  console.log('====================================');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('Testing optimized multi-agent system...\n');

  const results = [];
  const stats = {
    totalTests: TEST_CASES.length,
    passed: 0,
    failed: 0,
    totalDuration: 0,
    singleAgentAvg: 0,
    multiAgentAvg: 0,
    singleAgentCount: 0,
    multiAgentCount: 0
  };

  // Run tests sequentially
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.push(result);

    if (result.passed) {
      stats.passed++;
      console.log(`✅ PASSED (${result.duration.toFixed(2)}s)`);
    } else {
      stats.failed++;
      console.log(`❌ FAILED - Expected ${result.expectedMode}, got ${result.actualMode}`);
    }

    stats.totalDuration += result.duration;

    if (result.actualMode === 'single-agent') {
      stats.singleAgentAvg += result.duration;
      stats.singleAgentCount++;
    } else if (result.actualMode === 'multi-agent') {
      stats.multiAgentAvg += result.duration;
      stats.multiAgentCount++;
    }
  }

  // Calculate averages
  if (stats.singleAgentCount > 0) {
    stats.singleAgentAvg /= stats.singleAgentCount;
  }
  if (stats.multiAgentCount > 0) {
    stats.multiAgentAvg /= stats.multiAgentCount;
  }

  // Print summary
  console.log('\n====================================');
  console.log('PERFORMANCE SUMMARY');
  console.log('====================================');
  console.log(`Tests Run: ${stats.totalTests}`);
  console.log(`Passed: ${stats.passed} (${((stats.passed/stats.totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Total Time: ${stats.totalDuration.toFixed(2)}s`);
  console.log(`\nAverage Times:`);
  console.log(`  Single-Agent: ${stats.singleAgentAvg.toFixed(2)}s (${stats.singleAgentCount} tests)`);
  console.log(`  Multi-Agent: ${stats.multiAgentAvg.toFixed(2)}s (${stats.multiAgentCount} tests)`);
  console.log(`  Speed Improvement: ${((stats.multiAgentAvg/stats.singleAgentAvg - 1)*100).toFixed(1)}%`);

  // Save detailed results
  const reportDir = '.performance';
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir);
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: stats,
    results: results
  };

  const reportFile = `${reportDir}/report-${Date.now()}.json`;
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${reportFile}`);

  // Print detailed results table
  console.log('\n====================================');
  console.log('DETAILED RESULTS');
  console.log('====================================');
  console.log('Test Case                     | Mode        | Time    | Status');
  console.log('------------------------------|-------------|---------|--------');

  results.forEach(r => {
    const name = r.testCase.padEnd(29);
    const mode = (r.actualMode || 'unknown').padEnd(11);
    const time = `${r.duration.toFixed(2)}s`.padEnd(7);
    const status = r.passed ? '✅' : '❌';
    console.log(`${name} | ${mode} | ${time} | ${status}`);
  });

  return report;
}

// Run the tests
runAllTests().catch(console.error);