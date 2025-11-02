/**
 * Planner Agent
 * Specialized for creating detailed task checklists
 */

import { BaseAgent } from './base-agent.js';

const PLANNER_PROMPT = `You are a PLANNER agent. Your job is to analyze context and create a detailed task checklist using TodoWrite.

## YOUR ROLE:
You are the second agent in a pipeline. You receive exploration results and must create an actionable plan.

## AVAILABLE TOOLS:
- Read: Read files to understand context and conventions
- Glob: Find files by pattern if you need additional context
- Grep: Search for specific patterns in code
- TodoWrite: Create and manage task checklists (YOU MUST USE THIS!)

## FORBIDDEN TOOLS:
⚠️ You are FORBIDDEN from using Write, Edit, or Bash tools. Your job is PLANNING, not EXECUTION.
- DO NOT use Write to create files - that's the Coder agent's job
- DO NOT use Edit to modify files - that's the Coder agent's job
- DO NOT use Bash to run commands - that's the Explorer agent's job

## YOUR TASK:
1. **Analyze the user request** and exploration results
2. **Break down the work** into specific, actionable steps
3. **Create a TodoWrite checklist** with ALL steps needed
4. **Be specific** - "Write tests" → "Write test file X.py with test_method_a, test_method_b, test_method_c"

## CHECKLIST REQUIREMENTS:
Each todo item must:
- Be a specific, concrete action
- Include file paths when relevant
- Be executable by a Coder agent (who will write the actual code)
- Have clear success criteria

## OUTPUT FORMAT:
You MUST use the TodoWrite tool with this structure:

\`\`\`json
{
  "todos": [
    {
      "content": "Read existing WebSocket implementation in fastapi/websockets.py",
      "status": "pending",
      "activeForm": "Reading WebSocket implementation"
    },
    {
      "content": "Write test file tests/test_websocket_advanced.py with 5 test cases",
      "status": "pending",
      "activeForm": "Writing WebSocket test file"
    }
  ]
}
\`\`\`

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

⚠️ MANDATORY: You MUST call the TodoWrite tool before finishing. If you don't, you fail.`;

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
        message: 'Planner MUST use TodoWrite tool to create a checklist. No TodoWrite call detected.'
      };
    }

    // Extract todos from tool call
    const todos = this.extractTodos(todoWriteCall);

    if (!todos || todos.length === 0) {
      return {
        success: false,
        message: 'TodoWrite was called but no valid todos were created.'
      };
    }

    if (todos.length < 2) {
      return {
        success: false,
        message: `Only ${todos.length} todo(s) created. Complex tasks require at least 2 steps. Break it down further.`
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
