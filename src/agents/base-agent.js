/**
 * Base Agent Class
 * All specialized agents inherit from this
 */

import { query } from '../sdk.mjs';

export class BaseAgent {
  constructor(name, systemPrompt, allowedTools = []) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.allowedTools = allowedTools;
  }

  /**
   * Build the full prompt for this agent
   */
  buildPrompt(context, attemptNumber = 0) {
    let prompt = this.systemPrompt;

    // Add attempt-specific strengthening
    if (attemptNumber > 0) {
      prompt += `\n\n[WARNING] RETRY ATTEMPT #${attemptNumber + 1}: Your previous attempt failed validation. You MUST follow the requirements exactly this time.`;
    }

    // Add context from previous agents
    if (context.exploration) {
      prompt += `\n\n## EXPLORATION CONTEXT:\n${this.formatExploration(context.exploration)}`;
    }

    if (context.plan) {
      prompt += `\n\n## PLAN TO EXECUTE:\n${this.formatPlan(context.plan)}`;
    }

    // Add user request
    prompt += `\n\n## USER REQUEST:\n${context.request}`;

    return prompt;
  }

  /**
   * Format exploration context for other agents
   */
  formatExploration(exploration) {
    if (!exploration) return 'No exploration data available.';

    let formatted = `Summary: ${exploration.summary || 'N/A'}\n\n`;

    if (exploration.files_found && exploration.files_found.length > 0) {
      formatted += `Files Found (${exploration.files_found.length}):\n`;
      exploration.files_found.slice(0, 10).forEach(file => {
        formatted += `  - ${file.path} (${file.relevance || 'unknown'} relevance)\n`;
      });
      if (exploration.files_found.length > 10) {
        formatted += `  ... and ${exploration.files_found.length - 10} more\n`;
      }
    }

    if (exploration.key_snippets && exploration.key_snippets.length > 0) {
      formatted += `\nKey Code Snippets:\n`;
      exploration.key_snippets.slice(0, 3).forEach(snippet => {
        formatted += `\n${snippet.file} (lines ${snippet.lines}):\n\`\`\`\n${snippet.code.substring(0, 500)}\n\`\`\`\n`;
      });
    }

    return formatted;
  }

  /**
   * Format plan context for coder agent
   */
  formatPlan(plan) {
    if (!plan || !plan.todos) return 'No plan available.';

    let formatted = `Todo Checklist (${plan.todos.length} items):\n`;
    plan.todos.forEach((todo, idx) => {
      const status = {
        'pending': '○',
        'in_progress': '◐',
        'completed': '●'
      }[todo.status] || '?';
      formatted += `${status} ${idx + 1}. ${todo.content}\n`;
    });

    return formatted;
  }

  /**
   * Run this agent with the SDK
   */
  async execute(context, attemptNumber = 0) {
    const prompt = this.buildPrompt(context, attemptNumber);

    console.log(`\n[${this.name} Agent] Starting...`);
    if (attemptNumber > 0) {
      console.log(`[${this.name} Agent] Retry attempt #${attemptNumber + 1}`);
    }

    const result = {
      agent: this.name,
      output: '',
      tool_calls: [],
      raw_events: []
    };

    try {
      // Run the agent via SDK
      for await (const event of query({
        prompt: prompt,
        tools: true,
        signal: AbortSignal.timeout(300000) // 5 minute timeout
      })) {
        result.raw_events.push(event);

        // Accumulate text output
        if (event.type === 'stream_event' && event.event.delta?.text) {
          result.output += event.event.delta.text;
          // Show streaming output in console
          process.stdout.write(event.event.delta.text);
        }

        // Track tool calls
        if (event.type === 'tool_result') {
          // Validate tool is allowed for this agent
          if (this.allowedTools.length > 0 && !this.allowedTools.includes(event.tool)) {
            console.log(`\n[WARNING] [${this.name} Agent] Used RESTRICTED tool: ${event.tool}`);
            console.log(`   Allowed tools: ${this.allowedTools.join(', ')}`);
            // Store as restricted tool call
            result.tool_calls.push({
              tool: event.tool,
              result: event.result,
              restricted: true
            });
          } else {
            result.tool_calls.push({
              tool: event.tool,
              result: event.result,
              restricted: false
            });
            console.log(`\n[${this.name} Agent] Used tool: ${event.tool}`);
          }
        }

        // Handle errors
        if (event.type === 'error') {
          throw new Error(`Agent error: ${event.message}`);
        }
      }

      console.log(`\n[${this.name} Agent] Completed\n`);

      // Check for restricted tool usage
      const restrictedTools = result.tool_calls.filter(call => call.restricted);
      if (restrictedTools.length > 0) {
        const tools = restrictedTools.map(call => call.tool).join(', ');
        return {
          ...result,
          validated: {
            success: false,
            message: `Agent used restricted tools: ${tools}. Allowed tools: ${this.allowedTools.join(', ')}`
          },
          context: context
        };
      }

      // Let the specific agent validate its output
      const validated = await this.validate(result, context);

      return {
        ...result,
        validated: validated,
        context: context
      };

    } catch (error) {
      console.error(`\n[${this.name} Agent] Error: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * Validate agent output - override in subclasses
   */
  async validate(result, context) {
    // Base validation - just check we got some output
    return {
      success: result.output.length > 0,
      message: result.output.length > 0 ? 'Agent produced output' : 'No output generated'
    };
  }
}
