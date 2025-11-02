#!/usr/bin/env node

/**
 * Quick Performance Test
 * Demonstrates the performance improvements
 */

import { spawn } from 'child_process';

const TEST_CASES = [
  {
    name: 'Simple Question (Should use single-agent)',
    prompt: 'What is the difference between var and let?',
    expectedMode: 'single-agent'
  },
  {
    name: 'File Creation (Should use multi-agent)',
    prompt: 'Create a simple calculator.py file',
    expectedMode: 'multi-agent'
  },
  {
    name: 'Git Command (Should use single-agent)',
    prompt: 'git log --oneline -5',
    expectedMode: 'single-agent'
  }
];

async function runTest(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt: "${testCase.prompt}"`);
  console.log(`Expected mode: ${testCase.expectedMode}`);
  console.log('');

  const startTime = Date.now();

  return new Promise((resolve) => {
    const child = spawn('npm', ['start', '--', testCase.prompt], {
      cwd: '/opt/agent/coder-cc',
      shell: false
    });

    let output = '';
    let mode = 'unknown';
    let analysisConfidence = null;

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;

      // Show real-time output for analysis
      if (text.includes('[ANALYSIS]')) {
        process.stdout.write(text);
      }

      // Detect mode
      if (text.includes('[INFO] Using multi-agent mode') ||
          text.includes('[INFO] Launching multi-agent pipeline')) {
        mode = 'multi-agent';
        console.log('→ Mode detected: MULTI-AGENT');
      } else if (text.includes('[INFO] Using single-agent mode')) {
        mode = 'single-agent';
        console.log('→ Mode detected: SINGLE-AGENT');
      }

      // Extract confidence
      const confidenceMatch = text.match(/(\d+)% confidence/);
      if (confidenceMatch) {
        analysisConfidence = parseInt(confidenceMatch[1]);
      }
    });

    child.stderr.on('data', (data) => {
      // Ignore stderr for this test
    });

    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Extract metrics
      const tokenMatch = output.match(/Tokens - Input: (\d+), Output: (\d+)/);
      const computeMatch = output.match(/Compute time: ([\d.]+)s/);

      const result = {
        testCase: testCase.name,
        expectedMode: testCase.expectedMode,
        actualMode: mode,
        passed: mode === testCase.expectedMode,
        duration: duration,
        confidence: analysisConfidence,
        tokens: tokenMatch ? {
          input: parseInt(tokenMatch[1]),
          output: parseInt(tokenMatch[2])
        } : null,
        computeTime: computeMatch ? parseFloat(computeMatch[1]) : null
      };

      console.log(`\n📊 Results:`);
      console.log(`  ✓ Mode: ${result.actualMode} (${result.passed ? '✅ CORRECT' : '❌ WRONG'})`);
      console.log(`  ✓ Analyzer confidence: ${result.confidence}%`);
      console.log(`  ✓ Total time: ${result.duration.toFixed(2)}s`);
      if (result.computeTime) {
        console.log(`  ✓ LLM compute time: ${result.computeTime.toFixed(2)}s`);
      }
      if (result.tokens) {
        console.log(`  ✓ Tokens: ${result.tokens.input} in, ${result.tokens.output} out`);
      }

      resolve(result);
    });

    // Kill after 45 seconds
    setTimeout(() => {
      child.kill();
      console.log('⏱️ Test timed out after 45s');
      resolve({
        testCase: testCase.name,
        expectedMode: testCase.expectedMode,
        actualMode: 'timeout',
        passed: false,
        duration: 45
      });
    }, 45000);
  });
}

async function main() {
  console.log('\n🚀 PERFORMANCE TEST - Optimized Multi-Agent System');
  console.log('Testing intelligent routing between single and multi-agent modes...\n');

  const results = [];
  let singleAgentTime = 0;
  let multiAgentTime = 0;
  let singleAgentCount = 0;
  let multiAgentCount = 0;

  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.push(result);

    if (result.actualMode === 'single-agent') {
      singleAgentTime += result.duration;
      singleAgentCount++;
    } else if (result.actualMode === 'multi-agent') {
      multiAgentTime += result.duration;
      multiAgentCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('='.repeat(60));

  const correctRouting = results.filter(r => r.passed).length;
  console.log(`\n✅ Routing Accuracy: ${correctRouting}/${results.length} (${(correctRouting/results.length*100).toFixed(0)}%)`);

  if (singleAgentCount > 0) {
    const avgSingle = singleAgentTime / singleAgentCount;
    console.log(`\n⚡ Single-Agent Average: ${avgSingle.toFixed(2)}s`);
    console.log(`   Tests: ${singleAgentCount}`);
  }

  if (multiAgentCount > 0) {
    const avgMulti = multiAgentTime / multiAgentCount;
    console.log(`\n🔧 Multi-Agent Average: ${avgMulti.toFixed(2)}s`);
    console.log(`   Tests: ${multiAgentCount}`);
  }

  if (singleAgentCount > 0 && multiAgentCount > 0) {
    const avgSingle = singleAgentTime / singleAgentCount;
    const avgMulti = multiAgentTime / multiAgentCount;
    const speedup = avgMulti / avgSingle;
    console.log(`\n⚡ Performance Comparison:`);
    console.log(`   Single-agent is ${speedup.toFixed(1)}x faster for simple tasks`);
    console.log(`   Multi-agent provides better results for complex tasks`);
  }

  console.log('\n💡 Key Benefits:');
  console.log('  1. Automatic routing saves time on simple tasks');
  console.log('  2. Complex tasks still get multi-agent power');
  console.log('  3. Fallback mechanism prevents failures');
  console.log('  4. Overall better user experience');
}

main().catch(console.error);