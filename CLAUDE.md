# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LC-Coder is a local AI coding assistant that runs entirely on your machine using Ollama. It implements a Claude Code-like SDK with full tool support, streaming responses, and session management. The project translates between Anthropic's API format and Ollama's OpenAI-compatible format to enable local LLMs to use the same tool-calling architecture as Claude.

## Build & Run Commands

### Installation
```bash
npm install
```

### Running the Application
```bash
# Interactive mode (REPL)
npm start

# Single command mode
npm start "Your prompt here"

# Direct execution
node src/cli.js
```

### Configuration
- Copy `config.example.json` to `config.json` before first run
- Config is stored in project root as `config.json`
- Set `debugTools: true` in config to see raw Ollama responses
- Sessions are saved to `.sessions/` directory
- Debug logs go to `.debug/` directory

### Available CLI Commands (Interactive Mode)
- `/help` - Show available commands
- `/models` - List available Ollama models
- `/model <name>` - Switch to different model
- `/config` - Show current configuration
- `/clear` - Clear conversation history
- `/exit` - Exit program

## Architecture Overview

### Core Components

**src/sdk.mjs** - Main SDK entry point
- Exports `query()` generator function that handles the conversation loop
- Manages session state and tool execution
- Implements agentic loop: LLM response → tool execution → LLM response → ...
- Maximum 20 iterations to prevent infinite loops
- Yields events: `stream_event`, `tool_result`, `tool_error`, `assistant`, `session_end`

**src/ollama-client.js** - Ollama API client
- Translates between Anthropic message format and Ollama format
- `convertMessages()` - Converts Anthropic messages to Ollama format
- `convertTools()` - Converts Anthropic tool schema to OpenAI function format
- `convertStreamEvent()` - Translates Ollama stream events to Anthropic-like events
- Handles "thinking" tokens from models like Qwen3 by suppressing them during streaming
- Implements streaming via `streamChat()` and non-streaming via `chat()`

**src/cli.js** - CLI interface
- Builds platform-aware system prompt (Windows, macOS, Linux)
- Implements interactive REPL mode with conversation history
- Handles special commands (`/model`, `/config`, etc.)
- Manages single-command execution mode

**src/config.js** - Configuration management
- Loads config from project root `config.json`
- Provides get/set methods with dot notation support (e.g., `config.get('ollamaModel')`)
- Manages session and debug directory paths
- Singleton instance exported as `config`

**src/session.js** - Session management
- Tracks conversation history with timestamps
- Accumulates usage statistics (tokens, compute time, request count)
- Persists sessions to `.sessions/` directory as JSON
- Supports session resumption via `Session.load(sessionId)`

**src/tools/index.js** - Tool registry
- Central registry of all available tools
- `getToolDefinitions()` - Returns tool schemas for LLM
- `executeTool(name, input, context)` - Dispatches tool execution
- All tools follow the same interface: `{ name, description, inputSchema, execute() }`

### Tool Implementation Pattern

All tools in `src/tools/` follow this structure:
```javascript
export class ToolNameTool {
  constructor() {
    this.name = 'ToolName';
    this.description = 'What the tool does';
    this.inputSchema = {
      type: 'object',
      properties: { /* JSON Schema */ },
      required: [ /* required fields */ ]
    };
  }

  async execute(input, context) {
    // Tool logic here
    return {
      type: 'text',
      text: 'Result'
    };
  }
}
```

Context object provides:
- `workingDirectory` - Current working directory
- `session` - Session instance
- `bashMaxOutputLength` - Max output length for bash commands

### Message Flow Architecture

1. **User Input** → CLI captures prompt
2. **Message History** → Added to session and sent to SDK `query()`
3. **Ollama Request** → SDK converts messages to Ollama format via OllamaClient
4. **LLM Response** → Streamed back as Anthropic-like events
5. **Tool Detection** → If tool_calls present, execute via `executeTool()`
6. **Tool Results** → Added to message history as user messages
7. **Loop** → Return to step 3 until no more tool calls
8. **Session Save** → Persist conversation history

### Platform Detection

The CLI (src/cli.js:13-53) detects the platform and builds appropriate system prompts with platform-specific command examples. This ensures the LLM uses correct commands for Windows vs Unix-like systems.

## Key Implementation Details

### Tool Call Translation
Ollama returns OpenAI-style tool calls:
```javascript
{
  tool_calls: [{
    function: {
      name: "Bash",
      arguments: '{"command": "ls"}'
    }
  }]
}
```

The SDK extracts these and formats tool results as user messages to continue the conversation.

### Streaming Event Types
- `content_block_delta` - Streaming text from LLM
- `content_block_start` - Tool calls detected
- `message_stop` - Response complete with usage stats
- `message_delta` - Empty delta (used for filtered events like "thinking")

### Session Persistence
Sessions are automatically saved after each query completes. Each session file contains:
- Conversation messages with timestamps
- Usage statistics (input/output tokens, compute time)
- Metadata

### Adding New Tools

1. Create `src/tools/your-tool.js` following the tool pattern
2. Import and add to `TOOLS` object in `src/tools/index.js`
3. Tool will automatically be available to the LLM

## Configuration Options

Located in `config.json`:
- `ollamaEndpoint` - Ollama API endpoint (default: http://localhost:11434)
- `ollamaModel` - Model to use (default: qwen3:32b)
- `temperature` - Sampling temperature (0.0-1.0)
- `maxTokens` - Maximum output tokens
- `bashMaxOutputLength` - Max length for bash command output (prevents crashes)
- `debug` - Enable debug logging
- `debugTools` - Log raw Ollama responses
- `enableSessionResume` - Enable session persistence

## Important Notes

### No Tests
The project currently has no test suite. When adding features, manual testing is required.

### Model Compatibility
Not all Ollama models support tool calling. Recommended models:
- qwen3:32b - Best tool-calling support
- mistral - Good general purpose
- Models without tool support will fail to execute tools

### Ollama Must Be Running
The application requires Ollama server to be running at the configured endpoint. Start with `ollama serve` before using LC-Coder.

### Tool Execution Context
Tools execute in the working directory where the CLI was started. The `context.workingDirectory` parameter ensures bash commands run in the correct location.

### Windows vs Unix
The system prompt is dynamically built based on the platform to ensure the LLM uses correct shell commands (PowerShell/CMD vs bash).
