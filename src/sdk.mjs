/**
 * Claude Code Local SDK
 * Main SDK implementation using Ollama for local LLM
 */

import { OllamaClient } from './ollama-client.js';
import { config } from './config.js';
import { Session } from './session.js';
import { getToolDefinitions, executeTool } from './tools/index.js';

/**
 * Main query function - entry point for SDK
 */
export async function* query(options = {}) {
  const {
    prompt,
    messages = [],
    model,
    temperature,
    maxTokens,
    signal,
    sessionId,
    tools = true,
    permissionMode
  } = options;

  // Initialize session
  const session = sessionId ? Session.load(sessionId) : new Session();

  // Initialize Ollama client
  const ollamaClient = new OllamaClient({
    endpoint: config.get('ollamaEndpoint'),
    model: model || config.get('ollamaModel'),
    timeout: 300000
  });

  // Health check
  const isHealthy = await ollamaClient.healthCheck();
  if (!isHealthy) {
    yield {
      type: 'error',
      message: 'Ollama is not running. Please start Ollama with: ollama serve'
    };
    return;
  }

  // Build message history
  const messageHistory = [...session.getMessages()];

  // Add new user message
  if (prompt) {
    const userMessage = {
      role: 'user',
      content: prompt
    };
    messageHistory.push(userMessage);
    session.addMessage(userMessage);
  }

  if (messages.length > 0) {
    messageHistory.push(...messages);
    messages.forEach(msg => session.addMessage(msg));
  }

  // Get tool definitions if tools are enabled
  const toolDefinitions = tools ? getToolDefinitions() : [];

  // Main conversation loop
  let continueLoop = true;
  let maxIterations = 20; // Prevent infinite loops
  let iterationCount = 0;

  while (continueLoop && iterationCount < maxIterations) {
    iterationCount++;

    try {
      const startTime = Date.now();

      // Stream response from Ollama
      let fullResponse = '';
      let currentToolCalls = [];
      let usage = null;

      for await (const event of ollamaClient.streamChat(messageHistory, {
        model: model || config.get('ollamaModel'),
        temperature: temperature ?? config.get('temperature'),
        max_tokens: maxTokens || config.get('maxTokens'),
        tools: toolDefinitions,
        signal
      })) {
        // Yield stream event
        yield {
          type: 'stream_event',
          event: event
        };

        // Accumulate response
        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullResponse += event.delta.text;
        }

        if (event.type === 'content_block_start' && event.content_block?.tool_calls) {
          currentToolCalls = event.content_block.tool_calls;
        }

        if (event.type === 'message_stop') {
          usage = event.usage;
        }
      }

      const computeTime = Date.now() - startTime;

      // Update usage
      if (usage) {
        session.updateUsage({ ...usage, compute_time: computeTime });
      }

      // Build assistant message
      const assistantMessage = {
        role: 'assistant',
        content: fullResponse
      };

      session.addMessage(assistantMessage);
      messageHistory.push(assistantMessage);

      // Yield complete assistant message
      yield {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: fullResponse,
          usage: usage
        }
      };

      // Check if there are tool calls to execute
      if (currentToolCalls && currentToolCalls.length > 0) {
        // Execute tools
        for (const toolCall of currentToolCalls) {
          const toolName = toolCall.function.name;
          const toolInput = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

          // Check permission (simplified - always allow for now)
          const allowed = true;

          if (!allowed) {
            yield {
              type: 'tool_error',
              tool: toolName,
              error: 'Permission denied'
            };
            continue;
          }

          // Execute tool
          try {
            const result = await executeTool(toolName, toolInput, {
              workingDirectory: process.cwd(),
              session: session
            });

            // Add tool result to message history
            const toolMessage = {
              role: 'user',
              content: `Tool ${toolName} result:\n${result.text || result.error || JSON.stringify(result)}`
            };

            messageHistory.push(toolMessage);
            session.addMessage(toolMessage);

            yield {
              type: 'tool_result',
              tool: toolName,
              result: result
            };
          } catch (error) {
            yield {
              type: 'tool_error',
              tool: toolName,
              error: error.message
            };
          }
        }

        // Continue loop to get next response after tool execution
        continueLoop = true;
      } else {
        // No tool calls, conversation is complete
        continueLoop = false;
      }

    } catch (error) {
      yield {
        type: 'error',
        message: error.message
      };
      continueLoop = false;
    }
  }

  // Save session
  session.save();

  // Yield session summary
  yield {
    type: 'session_end',
    session: session.getSummary()
  };
}

/**
 * List available models from Ollama
 */
export async function listModels() {
  const client = new OllamaClient({
    endpoint: config.get('ollamaEndpoint')
  });

  return await client.listModels();
}

/**
 * Check Ollama health
 */
export async function healthCheck() {
  const client = new OllamaClient({
    endpoint: config.get('ollamaEndpoint')
  });

  return await client.healthCheck();
}

// Export configuration for programmatic access
export { config, Session };
