/**
 * Enhanced LC-Coder SDK
 * Incorporates verification, smart retry, and enhanced prompting
 */

import { OllamaClient } from './ollama-client.js';
import { config } from './config.js';
import { Session } from './session.js';
import { getToolDefinitions, executeTool } from './tools/index.js';
import { WorkVerifier } from './verification/work-verifier.js';
import { SmartRetry } from './retry/smart-retry.js';
import { getEnhancedSystemPrompt, getTaskCompletionReminder, getVerificationPrompt } from './prompts/enhanced-system-prompt.js';

/**
 * Enhanced query function with verification and retry
 */
export async function* queryEnhanced(options = {}) {
  const {
    prompt,
    messages = [],
    model,
    temperature,
    maxTokens,
    signal,
    sessionId,
    tools = true,
    useEnhancedMode = true,  // New option
    autoVerify = true,        // New option
    smartRetry = true,        // New option
    platformInfo = null
  } = options;

  // Initialize components
  const session = sessionId ? Session.load(sessionId) : new Session();
  const verifier = new WorkVerifier({ workingDirectory: process.cwd() });
  const retryHandler = new SmartRetry(3);

  // Initialize Ollama client
  const ollamaClient = new OllamaClient({
    endpoint: config.get('ollamaEndpoint'),
    model: model || config.get('ollamaModel'),
    timeout: 300000,
    debugTools: config.get('debugTools')
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

  // Build enhanced message history
  const messageHistory = [...session.getMessages()];

  // Use enhanced system prompt if enabled
  if (useEnhancedMode && platformInfo) {
    // Replace or add enhanced system prompt
    const enhancedPrompt = getEnhancedSystemPrompt(platformInfo);
    const systemIndex = messageHistory.findIndex(m => m.role === 'system');
    if (systemIndex >= 0) {
      messageHistory[systemIndex] = { role: 'system', content: enhancedPrompt };
    } else {
      messageHistory.unshift({ role: 'system', content: enhancedPrompt });
    }
  }

  // Add new messages
  if (prompt) {
    const userMessage = {
      role: 'user',
      content: useEnhancedMode ? `${prompt}\n\n${getTaskCompletionReminder()}` : prompt
    };
    messageHistory.push(userMessage);
    session.addMessage(userMessage);
  } else if (messages.length > 0) {
    for (const msg of messages) {
      messageHistory.push(msg);
      session.addMessage(msg);
    }
  }

  // Get available tools
  const availableTools = tools ? getToolDefinitions() : [];

  // Context for tool execution
  const context = {
    workingDirectory: process.cwd(),
    session,
    bashMaxOutputLength: config.get('bashMaxOutputLength') || 30000,
    verifier,
    retryHandler
  };

  // Track iterations to prevent infinite loops
  let iterations = 0;
  const maxIterations = 20;

  // Main agentic loop
  while (iterations < maxIterations) {
    iterations++;

    // Prepare Ollama request options
    const ollamaOptions = {
      temperature: temperature ?? config.get('temperature'),
      max_tokens: maxTokens || config.get('maxTokens'),
      tools: availableTools,
      signal
    };

    let assistantMessage = '';
    let toolCalls = [];

    try {
      // Stream the response
      for await (const event of ollamaClient.streamChat(messageHistory, ollamaOptions)) {
        // Process streaming events
        if (event.type === 'content_block_delta' && event.delta?.text) {
          assistantMessage += event.delta.text;
          yield {
            type: 'stream_event',
            event
          };
        } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          // Tool calls are starting
          yield {
            type: 'stream_event',
            event
          };
        } else if (event.type === 'message_delta') {
          // Empty delta (e.g., filtered thinking tokens)
          yield {
            type: 'stream_event',
            event
          };
        } else if (event.type === 'message_stop') {
          // Response complete
          if (event.usage) {
            session.updateUsage(event.usage);
          }
          yield {
            type: 'stream_event',
            event
          };
        }

        // Capture tool calls
        if (event.tool_calls) {
          toolCalls = event.tool_calls;
        }
      }

      // Add assistant message to history if there was text
      if (assistantMessage) {
        const msg = { role: 'assistant', content: assistantMessage };
        messageHistory.push(msg);
        session.addMessage(msg);
      }

      // Process tool calls if present
      if (toolCalls.length > 0) {
        yield {
          type: 'assistant',
          content: assistantMessage,
          hasTools: true
        };

        // Execute tools with verification and retry
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function?.name || toolCall.name;
          const toolInput = JSON.parse(toolCall.function?.arguments || toolCall.arguments || '{}');

          try {
            let toolResult;

            // Use smart retry if enabled
            if (smartRetry) {
              const retryResult = await retryHandler.executeWithRetry(
                toolName,
                toolInput,
                context
              );

              if (retryResult.success) {
                toolResult = retryResult.result;
                if (retryResult.attempts > 1) {
                  yield {
                    type: 'retry_info',
                    tool: toolName,
                    attempts: retryResult.attempts,
                    alternative: retryResult.alternative
                  };
                }
              } else {
                throw new Error(retryResult.error?.message || 'Tool execution failed after retries');
              }
            } else {
              // Normal execution without retry
              toolResult = await executeTool(toolName, toolInput, context);
            }

            // Verify the result if enabled
            if (autoVerify && toolResult) {
              let verification = null;

              // Perform verification based on tool type
              if (toolName === 'Write' && toolInput.file_path) {
                verification = await verifier.verifyFileWrite(
                  toolInput.file_path,
                  toolInput.content
                );
              } else if (toolName === 'Edit' && toolInput.file_path) {
                verification = await verifier.verifyFileEdit(
                  toolInput.file_path,
                  toolInput.old_string,
                  toolInput.new_string
                );
              } else if (toolName === 'Bash' && toolInput.command) {
                verification = await verifier.verifyCommand(toolInput.command);
              }

              // If verification failed, add to context
              if (verification && !verification.success) {
                yield {
                  type: 'verification_warning',
                  tool: toolName,
                  issues: verification.issues
                };

                // Add verification feedback to the tool result
                toolResult.text = `${toolResult.text || ''}\n\nVERIFICATION ISSUES:\n${verification.issues.join('\n')}`;
              }
            }

            yield {
              type: 'tool_result',
              tool: toolName,
              input: toolInput,
              result: toolResult
            };

            // Add tool result as user message
            const toolMessage = {
              role: 'user',
              content: `Tool result for ${toolName}:\n${toolResult.text || toolResult.content || 'Success'}`
            };
            messageHistory.push(toolMessage);
            session.addMessage(toolMessage);

          } catch (error) {
            yield {
              type: 'tool_error',
              tool: toolName,
              error: error.message
            };

            // Add error as user message so the model can try to recover
            const errorMessage = {
              role: 'user',
              content: `Tool ${toolName} failed with error: ${error.message}\n\nPlease try a different approach or fix the issue.`
            };
            messageHistory.push(errorMessage);
            session.addMessage(errorMessage);
          }
        }

        // Continue conversation to handle tool results
        continue;
      } else {
        // No tool calls, conversation complete
        if (assistantMessage) {
          yield {
            type: 'assistant',
            content: assistantMessage,
            hasTools: false
          };
        }
        break;
      }

    } catch (error) {
      yield {
        type: 'error',
        message: error.message
      };
      break;
    }
  }

  // Get verification summary if verification was used
  if (autoVerify) {
    const summary = verifier.getSummary();
    if (summary.total > 0) {
      yield {
        type: 'verification_summary',
        summary
      };

      // Get recommendations for improvements
      const recommendations = verifier.getRecommendations();
      if (recommendations.length > 0) {
        yield {
          type: 'recommendations',
          items: recommendations
        };
      }
    }
  }

  // Save session
  session.save();

  // Final event
  yield {
    type: 'session_end',
    session: session.getSummary()
  };
}

// Keep original query function for backwards compatibility
export { query } from './sdk.mjs';

// Export enhanced components
export { WorkVerifier } from './verification/work-verifier.js';
export { SmartRetry } from './retry/smart-retry.js';
export { getEnhancedSystemPrompt } from './prompts/enhanced-system-prompt.js';

// Re-export existing components
export { healthCheck, listModels, config, Session } from './sdk.mjs';