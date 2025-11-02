#!/usr/bin/env node

/**
 * Test the request analyzer with various prompts
 */

import { requestAnalyzer } from './src/request-analyzer.js';

const testPrompts = [
  // Should be multi-agent
  "Create a new Python module for handling user authentication",
  "Navigate to /opt/repos/fastapi and find all API endpoints. List them with their HTTP methods and paths.",
  "Refactor the database connection module to use connection pooling",
  "Write comprehensive unit tests for the WebSocket handler",
  "Find all instances of deprecated functions in the codebase and update them",
  "Build a REST API with CRUD operations for managing users",

  // Should be single-agent
  "What is a closure in JavaScript?",
  "Run npm install",
  "Show me the current git status",
  "How do async functions work?",
  "ls -la",
  "Check the version of Node.js",

  // Edge cases
  "Just run the tests",
  "Quick fix for the typo in README",
  "Create a simple hello world script",
  "Help me understand and refactor this complex algorithm",
];

console.log('Request Analyzer Test Results');
console.log('=' .repeat(80));

testPrompts.forEach((prompt, index) => {
  console.log(`\n[${index + 1}] "${prompt}"`);
  const analysis = requestAnalyzer.analyze(prompt);

  const confidence = Math.round(analysis.confidence * 100);
  console.log(`    Recommendation: ${analysis.recommendation} (${confidence}% confidence)`);
  console.log(`    Category: ${analysis.category}`);

  if (analysis.suggestedAgents.length > 0) {
    console.log(`    Agents: ${analysis.suggestedAgents.join(' → ')}`);
  }

  if (analysis.reasoning.length > 0) {
    console.log(`    Reasoning: ${analysis.reasoning[0]}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('Test complete!');