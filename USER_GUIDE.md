# Claude Code Local - User Guide

A complete local LLM implementation of Claude Code using Ollama instead of Anthropic API calls.

## Features

✅ **100% Local** - No API calls to external services
✅ **Ollama Integration** - Uses local Ollama models (Mistral, Llama, etc.)
✅ **All Tools Implemented** - Bash, Read, Write, Edit, Glob, Grep, TodoWrite, WebFetch, WebSearch
✅ **Streaming Responses** - Real-time streaming output
✅ **Session Management** - Save and resume conversations
✅ **Interactive & Non-Interactive Modes** - REPL or single queries
✅ **No Cost** - Free local inference

## Prerequisites

### 1. Install Node.js 18+
```bash
node --version  # Should be 18.0.0 or higher
```

### 2. Install and Start Ollama

**macOS/Linux:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama server
ollama serve
```

**In another terminal, pull a model:**
```bash
# Pull Mistral (recommended, ~4GB)
ollama pull mistral

# OR pull Llama 2 7B (~3.8GB)
ollama pull llama2

# OR pull other models
ollama list  # See available models
```

## Installation

```bash
# Clone or navigate to the repository
cd /home/user/coder-cc

# Install dependencies
npm install

# Test the installation
npm start -- --help
```

## Quick Start

### Interactive Mode (REPL)
```bash
npm start
```

This opens an interactive session where you can have conversations:
```
You: What files are in the current directory?
Assistant: [Uses Bash tool to run ls]

You: Read the package.json file
Assistant: [Uses Read tool to read the file]
```

### Non-Interactive Mode
```bash
npm start "What is 2+2?"
npm start "List all JavaScript files in this project"
npm start "Create a hello.txt file with 'Hello World'"
```

## CLI Commands

While in interactive mode, you can use these special commands:

- `/help` - Show available commands
- `/models` - List all available Ollama models
- `/model <name>` - Switch to a different model
- `/config` - Show current configuration
- `/clear` - Clear conversation history
- `/exit` or `exit` - Exit the program

## Configuration

Configuration is stored in `~/.claude-local/config.json`:

```json
{
  "ollamaEndpoint": "http://localhost:11434",
  "ollamaModel": "mistral:latest",
  "temperature": 0.7,
  "maxTokens": 32000,
  "permissionMode": "default",
  "bashMaxOutputLength": 30000,
  "debug": false,
  "enableSessionResume": true,
  "mcpServers": {}
}
```

### Environment Variables

You can also configure via environment variables:

```bash
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="mistral:latest"
export CLAUDE_LOCAL_CONFIG_DIR="$HOME/.claude-local"
export DEBUG="true"
```

## Available Tools

The AI has access to these tools:

### File Operations
- **Read** - Read file contents with line numbers
- **Write** - Create or overwrite files
- **Edit** - Edit files by replacing text
- **Glob** - Find files matching patterns (e.g., `**/*.js`)
- **Grep** - Search for text in files using regex

### Execution
- **Bash** - Execute shell commands

### Web
- **WebFetch** - Fetch content from URLs
- **WebSearch** - Web search (requires configuration)

### Task Management
- **TodoWrite** - Create and manage task lists

## Usage Examples

### Example 1: File Analysis
```
You: Analyze all JavaScript files in the src directory

[AI uses Glob to find files]
[AI uses Read to read each file]
[AI provides analysis]
```

### Example 2: Code Refactoring
```
You: Refactor src/config.js to use ES6 classes

[AI reads the file]
[AI uses Edit to make changes]
[AI confirms changes]
```

### Example 3: Running Tests
```
You: Run the test suite and fix any failures

[AI uses Bash to run tests]
[AI analyzes failures]
[AI edits code to fix issues]
[AI runs tests again to verify]
```

## Sessions

All conversations are saved as sessions in `~/.claude-local/sessions/`.

Each session includes:
- Full message history
- Token usage statistics
- Compute time
- Session metadata

To list available sessions in interactive mode:
```
You: /sessions
```

To resume a previous session:
```
You: /resume <session-id>
```

## Switching Models

You can change the model during a conversation:

```
You: /models
Available models:
  - mistral:latest (current)
  - llama2:7b
  - codellama:7b

You: /model llama2:7b
Switched to model: llama2:7b
```

Or via configuration:
```bash
export OLLAMA_MODEL="codellama:7b"
npm start
```

## Performance Tips

1. **Model Selection:**
   - Smaller models (7B): Faster, less memory, good for simple tasks
   - Larger models (13B+): Better quality, slower, more memory

2. **Hardware:**
   - GPU: Significantly faster inference
   - CPU: Works but slower
   - RAM: 8GB minimum, 16GB+ recommended

3. **Token Limits:**
   - Adjust `maxTokens` in config for longer/shorter responses
   - Lower token limits = faster responses

## Troubleshooting

### "Cannot connect to Ollama"
```bash
# Make sure Ollama is running
ollama serve

# Check if it's accessible
curl http://localhost:11434/api/tags
```

### "Model not found"
```bash
# Pull the model first
ollama pull mistral

# List available models
ollama list
```

### "Out of memory"
```bash
# Use a smaller model
ollama pull mistral:7b

# Or adjust Ollama settings (see Ollama docs)
```

### Permission Errors
```bash
# Make sure CLI is executable
chmod +x src/cli.js

# Check file permissions in working directory
```

## Differences from Claude Code

| Feature | Claude Code (Official) | Claude Code Local |
|---------|----------------------|-------------------|
| LLM Backend | Anthropic API | Ollama (local) |
| Cost | Pay per token | Free |
| Privacy | Data sent to Anthropic | 100% local |
| Speed | Network dependent | Local hardware dependent |
| Model | Claude 3.5 Sonnet/Opus | Mistral, Llama, etc. |
| Authentication | OAuth/API Key | None required |
| Offline | No | Yes |

## Advanced Usage

### Programmatic API

You can use the SDK programmatically in your own Node.js code:

```javascript
import { query, config } from './src/sdk.mjs';

async function example() {
  for await (const event of query({
    prompt: 'List all files in the current directory',
  })) {
    if (event.type === 'assistant') {
      console.log('Response:', event.message.content);
    }
  }
}

example();
```

### Custom Tools

To add custom tools, create a new file in `src/tools/` following this pattern:

```javascript
export class MyCustomTool {
  constructor() {
    this.name = 'MyTool';
    this.description = 'What this tool does';
    this.inputSchema = {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '...' }
      },
      required: ['param1']
    };
  }

  async execute(input, context) {
    // Your tool logic here
    return {
      type: 'text',
      text: 'Tool result'
    };
  }
}
```

Then register it in `src/tools/index.js`.

## Support

For issues, questions, or contributions, please refer to the project repository.

## License

MIT
