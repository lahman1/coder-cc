/**
 * Task-specific prompt templates
 * Provides optimized prompts for common coding tasks
 */

export const TASK_TEMPLATES = {
  findEndpoints: {
    name: 'Find API Endpoints',
    languages: ['python', 'javascript', 'java'],
    template: `Find all API endpoints in this project. For each endpoint:
1. Use Grep to search for route decorators/annotations (@app.route, @router, @GetMapping, etc.)
2. Read the files containing endpoints
3. List each endpoint with:
   - HTTP method (GET, POST, etc.)
   - Path/URL pattern
   - Handler function name
   - Brief description of what it does
   - Required parameters
4. Organize by module/controller
5. Include authentication requirements if visible`,
    tools: ['Grep', 'Read', 'Glob']
  },

  findBugs: {
    name: 'Find Potential Bugs',
    languages: ['all'],
    template: `Systematically check for bugs in this codebase:
1. Search for common bug patterns:
   - Null/undefined checks: Look for potential NullPointerException/TypeError
   - Array bounds: Find array access without bounds checking
   - Resource leaks: Unclosed files, connections, streams
   - Race conditions: Shared mutable state without synchronization
   - SQL injection: String concatenation in queries
   - Error swallowing: Empty catch blocks
2. For each issue found:
   - File and line number
   - Bug type and severity
   - Code snippet
   - Suggested fix
3. Prioritize by severity (Critical > High > Medium > Low)`,
    tools: ['Grep', 'Read']
  },

  writeTests: {
    name: 'Write Unit Tests',
    languages: ['all'],
    template: `Write comprehensive unit tests for the specified function/class:
1. First, Read the implementation to understand the code
2. Identify test cases:
   - Happy path (normal operation)
   - Edge cases (boundaries, empty inputs)
   - Error cases (invalid inputs, exceptions)
   - Special values (null, undefined, zero, negative)
3. Create test file with:
   - Proper test framework imports
   - Test suite setup/teardown if needed
   - Descriptive test names
   - Assertions for all cases
   - Mocks/stubs for dependencies
4. Use Write tool to create the complete test file
5. Verify tests are runnable`,
    tools: ['Read', 'Write', 'Bash']
  },

  refactorCode: {
    name: 'Refactor Code',
    languages: ['all'],
    template: `Refactor the code to improve quality:
1. Analyze current implementation:
   - Read the file completely
   - Identify code smells (duplication, long methods, poor naming)
   - Check for violations of SOLID principles
2. Plan refactoring:
   - Extract methods for duplicate code
   - Improve variable/function names
   - Simplify complex conditionals
   - Add appropriate abstractions
3. Apply changes:
   - Use Edit to modify the file
   - Maintain functionality (don't break existing code)
   - Ensure consistent style
4. Verify changes:
   - Read the file again to confirm
   - Check that logic is preserved`,
    tools: ['Read', 'Edit', 'Grep']
  },

  addFeature: {
    name: 'Add New Feature',
    languages: ['all'],
    template: `Implement the requested feature completely:
1. Understand requirements:
   - What should the feature do?
   - Where should it be added?
   - What are the inputs/outputs?
2. Explore existing code:
   - Find similar features for reference
   - Understand project conventions
   - Identify integration points
3. Implementation plan using TodoWrite:
   - List all files to create/modify
   - Define interfaces/contracts
   - Plan error handling
4. Write the implementation:
   - Create new files with Write
   - Modify existing files with Edit
   - Follow project style
5. Add tests for the feature
6. Verify everything works`,
    tools: ['TodoWrite', 'Grep', 'Read', 'Write', 'Edit', 'Bash']
  },

  documentCode: {
    name: 'Add Documentation',
    languages: ['all'],
    template: `Add comprehensive documentation to the code:
1. Read the file to understand the code
2. Add documentation for:
   - File header with purpose and usage
   - Class/module overview
   - Function/method documentation:
     * Purpose and behavior
     * Parameters with types and descriptions
     * Return values
     * Exceptions thrown
     * Usage examples
     * Complexity notes if relevant
3. Use the project's documentation style:
   - JSDoc for JavaScript
   - Docstrings for Python
   - JavaDoc for Java
   - Doxygen for C++
4. Edit the file to add documentation
5. Ensure documentation is accurate and helpful`,
    tools: ['Read', 'Edit']
  },

  fixError: {
    name: 'Fix Error',
    languages: ['all'],
    template: `Debug and fix the reported error:
1. Understand the error:
   - Read the full error message/stack trace
   - Identify the error type
   - Locate the exact file and line
2. Investigate the cause:
   - Read the problematic code
   - Check related files if needed
   - Understand the context
3. Develop a fix:
   - Address root cause, not symptoms
   - Consider edge cases
   - Maintain backward compatibility
4. Apply the fix:
   - Edit the file with the correction
   - Add error handling if missing
   - Add validation if appropriate
5. Verify the fix:
   - Run the code to confirm error is resolved
   - Check for regression
6. Add a test to prevent recurrence`,
    tools: ['Read', 'Edit', 'Bash', 'Write']
  },

  optimizePerformance: {
    name: 'Optimize Performance',
    languages: ['all'],
    template: `Optimize code for better performance:
1. Profile current implementation:
   - Identify bottlenecks
   - Check algorithmic complexity
   - Look for inefficient patterns
2. Common optimizations to check:
   - Unnecessary loops or nested loops
   - Repeated calculations
   - Inefficient data structures
   - Memory leaks
   - Unnecessary I/O operations
   - Missing caching opportunities
3. Apply optimizations:
   - Use more efficient algorithms
   - Add caching where appropriate
   - Reduce memory allocations
   - Batch operations
   - Use lazy evaluation
4. Verify improvements:
   - Ensure functionality unchanged
   - Measure performance gain
   - Check memory usage`,
    tools: ['Read', 'Edit', 'Bash']
  },

  securityAudit: {
    name: 'Security Audit',
    languages: ['all'],
    template: `Perform security audit on the codebase:
1. Check for common vulnerabilities:
   - SQL Injection: String concatenation in queries
   - XSS: Unescaped user input in HTML
   - Path Traversal: Unchecked file paths
   - Command Injection: Shell command construction
   - Sensitive Data: Hardcoded secrets/passwords
   - CORS: Overly permissive policies
   - Authentication: Weak or missing checks
   - Authorization: Privilege escalation risks
2. For each issue:
   - Severity level (Critical/High/Medium/Low)
   - File and location
   - Vulnerability explanation
   - Proof of concept if applicable
   - Recommended fix
3. Generate security report with priorities`,
    tools: ['Grep', 'Read']
  }
};

/**
 * Get the appropriate template for a task
 */
export function getTaskTemplate(taskType, userPrompt) {
  const template = TASK_TEMPLATES[taskType];
  if (!template) {
    return null;
  }

  return {
    ...template,
    enhancedPrompt: `${template.template}\n\nUser request: ${userPrompt}`
  };
}

/**
 * Detect task type from user prompt
 */
export function detectTaskType(prompt) {
  const promptLower = prompt.toLowerCase();

  const patterns = {
    findEndpoints: /find.*endpoint|list.*api|show.*route/i,
    findBugs: /find.*bug|check.*error|security.*issue|vulnerability/i,
    writeTests: /write.*test|create.*test|add.*test|unit.*test/i,
    refactorCode: /refactor|improve.*code|clean.*up|reduce.*duplication/i,
    addFeature: /add.*feature|implement|create.*new|build/i,
    documentCode: /document|add.*comment|explain.*code|add.*docs/i,
    fixError: /fix.*error|debug|solve.*issue|error.*message/i,
    optimizePerformance: /optimize|improve.*performance|make.*faster|reduce.*memory/i,
    securityAudit: /security.*audit|check.*security|find.*vulnerability/i
  };

  for (const [taskType, pattern] of Object.entries(patterns)) {
    if (pattern.test(promptLower)) {
      return taskType;
    }
  }

  return null;
}

/**
 * Enhance user prompt with task template
 */
export function enhancePromptWithTemplate(userPrompt) {
  const taskType = detectTaskType(userPrompt);

  if (!taskType) {
    return userPrompt;
  }

  const template = getTaskTemplate(taskType, userPrompt);

  console.log(`📋 Detected task type: ${template.name}`);
  console.log(`🔧 Recommended tools: ${template.tools.join(', ')}`);

  return template.enhancedPrompt;
}