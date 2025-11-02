/**
 * Planner Agent
 * Specialized for creating detailed task checklists
 */

import { BaseAgent } from './base-agent.js';

const PLANNER_PROMPT = `You are a PLANNER agent. Your ONLY job is to create a todo checklist BY CALLING THE TODOWRITE TOOL.

## FIRST ACTION - DO THIS IMMEDIATELY:
When you see this prompt, your FIRST action must be to CALL the TodoWrite tool.
Don't explain. Don't output JSON. CALL THE TOOL.

## CRITICAL RULES - READ CAREFULLY:
[MANDATORY] You MUST use TodoWrite tool - ACTUALLY CALL IT
[FORBIDDEN] You CANNOT use Write or Edit tools
[REQUIRED] Create at least 2 specific todo items
[REQUIRED] Make the tool call, don't just output JSON

## YOUR ROLE:
You receive exploration results and create a step-by-step plan.
You DO NOT write code. You DO NOT execute tasks. You ONLY plan.

## TOOLS YOU MUST USE:
1. TodoWrite - [MANDATORY] Create the checklist
2. Read - Optional: Read files for more context
3. Grep - Optional: Search for patterns
4. Glob - Optional: Find more files

## FORBIDDEN TOOLS:
- Write [NEVER USE] - The Coder will write files
- Edit [NEVER USE] - The Coder will edit files
- Bash [NEVER USE] - Not for planning

## YOUR TASK - STOP AFTER TODOWRITE:
1. Call TodoWrite to create the checklist
2. STOP - Do nothing else
3. DO NOT use Write, Edit, or Bash
4. Your job is DONE after TodoWrite

REMEMBER: You ONLY plan. The CODER will execute.
After calling TodoWrite, you are FINISHED.

## CHECKLIST REQUIREMENTS:
Each todo item must:
- Be a specific, concrete action
- Include file paths when relevant
- Be executable by a Coder agent (who will write the actual code)
- Have clear success criteria

## HOW TO CALL TODOWRITE - CRITICAL:
You MUST make a tool call. Don't just output JSON.
The CORRECT way to call TodoWrite:

[TOOL CALLS DETECTED]
Tool: TodoWrite
Arguments: {
  "todos": [
    {
      "content": "Read tests/test_hello.py to check existing content",
      "status": "pending",
      "activeForm": "Reading existing file"
    },
    {
      "content": "Write tests/test_hello.py with hello world script",
      "status": "pending",
      "activeForm": "Writing hello world script"
    }
  ]
}

DO NOT just write JSON in your response.
DO NOT explain what you would do.
ACTUALLY CALL the TodoWrite tool with the arguments.

## CRITICAL RULES:
1. YOU MUST USE TodoWrite - this is not optional
2. Create at least 3 todo items (break tasks down properly)
3. Each item should be completable by the Coder agent
4. Be specific about file paths and names
5. Include items for: reading context, writing code, verifying work

## EXAMPLE:
User request: "Add unit tests for WebSocket error handling"
Exploration found: fastapi/websockets.py, tests/test_ws_router.py

Your checklist should include:
1. Read fastapi/websockets.py to understand WebSocket class
2. Read tests/test_ws_router.py to understand test conventions
3. Create tests/test_websocket_errors.py with test_connection_error test case
4. Add test_invalid_message test case to same file
5. Add test_timeout_handling test case to same file
6. Verify all tests follow project conventions (assert statements, fixtures, etc.)

Remember: The Coder agent will execute this checklist item-by-item. Make it clear and actionable!

[MANDATORY] Call TodoWrite ONCE and STOP.
[FORBIDDEN] Do NOT use Write, Edit, or Bash.
[REMEMBER] Your ONLY job: Create the todo list. Then STOP.`;

export class PlannerAgent extends BaseAgent {
  constructor() {
    super(
      'Planner',
      PLANNER_PROMPT,
      ['Read', 'Glob', 'Grep', 'TodoWrite']
    );
  }

  /**
   * Validate Planner output - MUST have TodoWrite
   */
  async validate(result, context) {
    // Check if TodoWrite was used
    const todoWriteCall = result.tool_calls.find(call => call.tool === 'TodoWrite');

    if (!todoWriteCall) {
      return {
        success: false,
        message: 'Planner MUST use TodoWrite tool to create a checklist. No TodoWrite call detected.',
        details: {
          missingTools: ['TodoWrite'],
          suggestion: 'You must call TodoWrite with a list of todos. Each todo should be a specific, actionable task.'
        }
      };
    }

    // Extract todos from tool call
    const todos = this.extractTodos(todoWriteCall);

    if (!todos || todos.length === 0) {
      return {
        success: false,
        message: 'TodoWrite was called but no valid todos were created.',
        details: {
          requiredCount: 2,
          suggestion: 'Ensure TodoWrite is called with properly formatted todos array containing content, status, and activeForm fields.'
        }
      };
    }

    // Validate minimum complexity
    if (todos.length < 2) {
      return {
        success: false,
        message: `Only ${todos.length} todo(s) created. Complex tasks require at least 2 steps.`,
        details: {
          requiredCount: 2,
          actualCount: todos.length,
          suggestion: 'Break down the task into more specific steps. Include steps for: reading context, writing/modifying code, and verification.'
        }
      };
    }

    // Check quality of todos
    const qualityIssues = this.validateTodoQuality(todos);
    if (qualityIssues.length > 0) {
      return {
        success: false,
        message: 'Todos lack specificity or actionable details.',
        details: {
          issues: qualityIssues,
          suggestion: 'Each todo must be specific and actionable. Include file paths, function names, or clear descriptions of what to do.'
        }
      };
    }

    return {
      success: true,
      message: `Created ${todos.length} actionable tasks`,
      data: {
        todos: todos,
        raw_output: result.output
      }
    };
  }

  /**
   * Validate the quality of todos
   */
  validateTodoQuality(todos) {
    const issues = [];

    todos.forEach((todo, index) => {
      const content = todo.content.toLowerCase();

      // Check for vague todos
      if (content.length < 10) {
        issues.push(`Todo ${index + 1} is too short: "${todo.content}"`);
      }

      // Check for non-actionable words
      const vaguePatterns = [
        /^do /,
        /^handle /,
        /^process /,
        /^work on /,
        /^deal with /
      ];

      if (vaguePatterns.some(pattern => pattern.test(content))) {
        issues.push(`Todo ${index + 1} is too vague: "${todo.content}"`);
      }

      // Check that Write/Create tasks include file paths
      if ((content.includes('write') || content.includes('create')) && !content.includes('/') && !content.includes('.')) {
        issues.push(`Todo ${index + 1} should specify a file path: "${todo.content}"`);
      }
    });

    return issues;
  }

  /**
   * Extract todos from TodoWrite tool call
   */
  extractTodos(toolCall) {
    if (!toolCall || !toolCall.result) {
      return [];
    }

    // The TodoWrite tool should return the todos in the result
    // Try to parse from result text
    const resultText = toolCall.result.text || '';

    // Look for todo items in the result
    const todos = [];
    const lines = resultText.split('\n');

    lines.forEach(line => {
      // Match lines like: "○ Task description" or "◐ Task description" or "● Task description"
      const match = line.match(/^[○◐●]\s+(.+)$/);
      if (match) {
        todos.push({
          content: match[1].trim(),
          status: 'pending',
          activeForm: match[1].trim()
        });
      }
    });

    // If we didn't find any, try to extract from the output text
    if (todos.length === 0) {
      const output = toolCall.result.text || '';
      const contentMatches = output.match(/"content":\s*"([^"]+)"/g);
      if (contentMatches) {
        contentMatches.forEach(match => {
          const content = match.match(/"content":\s*"([^"]+)"/)[1];
          todos.push({
            content: content,
            status: 'pending',
            activeForm: content
          });
        });
      }
    }

    return todos;
  }
}
