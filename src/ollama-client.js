/**
 * Ollama API Client
 * Handles communication with local Ollama instance
 */

export class OllamaClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'mistral:latest';
    this.timeout = config.timeout || 300000; // 5 minutes default
  }

  /**
   * Send a chat completion request to Ollama
   */
  async chat(messages, options = {}) {
    const url = `${this.endpoint}/api/chat`;

    const requestBody = {
      model: options.model || this.model,
      messages: this.convertMessages(messages),
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.max_tokens || 32000,
      }
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestBody.tools = this.convertTools(options.tools);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return this.convertResponse(data);
  }

  /**
   * Stream chat completion from Ollama
   */
  async *streamChat(messages, options = {}) {
    const url = `${this.endpoint}/api/chat`;

    const requestBody = {
      model: options.model || this.model,
      messages: this.convertMessages(messages),
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.max_tokens || 32000,
      }
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestBody.tools = this.convertTools(options.tools);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    // Parse streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              yield this.convertStreamEvent(data);
            } catch (e) {
              console.error('Failed to parse stream line:', line, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Convert Anthropic message format to Ollama format
   */
  convertMessages(messages) {
    return messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }

      if (msg.role && msg.content) {
        // Already in correct format or close to it
        if (Array.isArray(msg.content)) {
          // Handle content blocks (text, images, tool results)
          const textContent = msg.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');

          return {
            role: msg.role,
            content: textContent
          };
        }

        return {
          role: msg.role,
          content: msg.content
        };
      }

      return msg;
    });
  }

  /**
   * Convert Anthropic tool format to Ollama/OpenAI function format
   */
  convertTools(tools) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));
  }

  /**
   * Convert Ollama response to Anthropic-like format
   */
  convertResponse(data) {
    const content = [];

    // Add text content
    if (data.message && data.message.content) {
      content.push({
        type: 'text',
        text: data.message.content
      });
    }

    // Add tool calls if present
    if (data.message && data.message.tool_calls) {
      for (const toolCall of data.message.tool_calls) {
        content.push({
          type: 'tool_use',
          id: toolCall.id || this.generateToolId(),
          name: toolCall.function.name,
          input: typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments
        });
      }
    }

    return {
      id: data.id || this.generateMessageId(),
      type: 'message',
      role: 'assistant',
      content: content,
      model: data.model || this.model,
      stop_reason: data.done ? 'end_turn' : null,
      usage: {
        input_tokens: data.prompt_eval_count || 0,
        output_tokens: data.eval_count || 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0
      }
    };
  }

  /**
   * Convert Ollama stream event to Anthropic-like format
   */
  convertStreamEvent(data) {
    if (data.done) {
      return {
        type: 'message_stop',
        usage: {
          input_tokens: data.prompt_eval_count || 0,
          output_tokens: data.eval_count || 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0
        }
      };
    }

    if (data.message && data.message.content) {
      return {
        type: 'content_block_delta',
        delta: {
          type: 'text',
          text: data.message.content
        }
      };
    }

    if (data.message && data.message.tool_calls) {
      return {
        type: 'content_block_start',
        content_block: {
          type: 'tool_use',
          tool_calls: data.message.tool_calls
        }
      };
    }

    return {
      type: 'message_delta',
      delta: {}
    };
  }

  /**
   * List available models from Ollama
   */
  async listModels() {
    const url = `${this.endpoint}/api/tags`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck() {
    try {
      const url = `${this.endpoint}/api/tags`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Generate a unique tool use ID
   */
  generateToolId() {
    return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
