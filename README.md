# Claude Code Local - Complete Local LLM Implementation

A **complete, working implementation** of Claude Code that runs 100% locally using Ollama instead of Anthropic API calls. This is a full-featured clone with all the same capabilities as Claude Code, but powered by local open-source models.

## 🚀 Features

- ✅ **100% Local & Private** - No data sent to external servers
- ✅ **Free to Use** - No API costs
- ✅ **Offline Capable** - Works without internet
- ✅ **All Tools Implemented** - Bash, Read, Write, Edit, Glob, Grep, WebFetch, TodoWrite, and more
- ✅ **Streaming Responses** - Real-time output as the model generates
- ✅ **Session Management** - Save and resume conversations
- ✅ **Multiple Model Support** - Use any Ollama model (Mistral, Llama, CodeLlama, etc.)
- ✅ **Interactive & Non-Interactive Modes** - REPL or single commands

## 📋 Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Ollama** - Local LLM runtime
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh

   # Start Ollama server
   ollama serve

   # Pull a model (in another terminal)
   ollama pull mistral
   ```

## 🔧 Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd coder-cc

# Install dependencies
npm install

# Run the CLI
npm start
```

## 🎯 Quick Start

### Interactive Mode (Recommended)
```bash
npm start
```

Example conversation:
```
You: What files are in this directory?
Assistant: Let me check that for you.
[Uses Bash tool to run 'ls']

You: Read the package.json file
Assistant: I'll read that file for you.
[Uses Read tool]
```

### Single Command Mode
```bash
npm start "List all JavaScript files in this project"
npm start "Create a file called hello.txt with 'Hello World'"
npm start "What is the content of src/config.js?"
```

## 🛠️ Available Tools

The AI assistant has access to these tools:

| Tool | Description |
|------|-------------|
| **Bash** | Execute shell commands |
| **Read** | Read file contents with line numbers |
| **Write** | Create or overwrite files |
| **Edit** | Edit files by replacing text |
| **Glob** | Find files matching patterns (e.g., `**/*.js`) |
| **Grep** | Search for text in files using regex |
| **WebFetch** | Fetch content from URLs |
| **TodoWrite** | Create and manage task lists |
| **WebSearch** | Web search (requires API configuration) |

## 📖 CLI Commands

In interactive mode, you can use special commands:

- `/help` - Show available commands
- `/models` - List all available Ollama models
- `/model <name>` - Switch to a different model
- `/config` - Show current configuration
- `/clear` - Clear conversation history
- `/exit` or `exit` - Exit the program

## ⚙️ Configuration

Configuration is stored in `~/.claude-local/config.json`:

```json
{
  "ollamaEndpoint": "http://localhost:11434",
  "ollamaModel": "mistral:latest",
  "temperature": 0.7,
  "maxTokens": 32000,
  "permissionMode": "default",
  "debug": false
}
```

You can also configure via environment variables:

```bash
export OLLAMA_ENDPOINT="http://localhost:11434"
export OLLAMA_MODEL="mistral:latest"
export CLAUDE_LOCAL_CONFIG_DIR="$HOME/.claude-local"
```

## 📚 Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user guide with examples
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Original Claude Code architecture analysis
- **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)** - Technical integration details
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference guide

## 🏗️ Project Structure

```
coder-cc/
├── src/
│   ├── cli.js              # CLI entry point
│   ├── sdk.mjs             # Core SDK implementation
│   ├── ollama-client.js    # Ollama API client
│   ├── config.js           # Configuration management
│   ├── session.js          # Session management
│   └── tools/              # Tool implementations
│       ├── index.js        # Tool registry
│       ├── bash.js         # Bash tool
│       ├── read.js         # Read file tool
│       ├── write.js        # Write file tool
│       ├── edit.js         # Edit file tool
│       ├── glob.js         # File pattern matching
│       ├── grep.js         # Text search tool
│       ├── todo-write.js   # Task management
│       ├── web-fetch.js    # Web fetching
│       └── web-search.js   # Web search
├── package.json
├── README.md
└── USER_GUIDE.md
```

## 🔄 Switching Models

Change models during a conversation:

```
You: /models
Available models:
  - mistral:latest (current)
  - llama2:7b
  - codellama:7b

You: /model codellama:7b
Switched to model: codellama:7b
```

Recommended models for different tasks:
- **Mistral 7B** - General purpose, good balance
- **CodeLlama 7B** - Best for coding tasks
- **Llama 2 13B** - Higher quality, slower
- **Llama 2 7B** - Faster, lower quality

## 💡 Usage Examples

### Example 1: Project Analysis
```
You: Analyze the structure of this project and tell me what it does

[AI uses Glob to find files]
[AI uses Read to read package.json and key files]
[AI provides comprehensive analysis]
```

### Example 2: Code Refactoring
```
You: Refactor src/config.js to use TypeScript

[AI reads the file]
[AI analyzes the code]
[AI creates new TypeScript version]
[AI shows differences]
```

### Example 3: Automated Testing
```
You: Run tests and fix any failures

[AI uses Bash to run tests]
[AI analyzes test output]
[AI identifies issues]
[AI edits files to fix problems]
[AI reruns tests to verify]
```

## 🆚 Comparison: Claude Code vs Claude Code Local

| Feature | Claude Code (Official) | Claude Code Local |
|---------|----------------------|-------------------|
| **LLM Backend** | Anthropic API (Claude 3.5) | Ollama (Local Models) |
| **Privacy** | Data sent to Anthropic | 100% local |
| **Cost** | Pay per token (~$3-15/1M tokens) | Free |
| **Speed** | Network latency | Local hardware speed |
| **Offline** | No | Yes |
| **Authentication** | OAuth/API Key required | None required |
| **Model Choice** | Claude models only | Any Ollama model |
| **Quality** | Very high (Claude 3.5) | Depends on model (7B-70B+) |

## 🔧 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### "Model not found"
```bash
# Pull the model
ollama pull mistral

# List available models
ollama list
```

### Out of Memory
```bash
# Use a smaller model
ollama pull mistral:7b

# Or use quantized versions
ollama pull mistral:7b-q4_0
```

## 🚀 Advanced Usage

### Programmatic API

Use the SDK in your own Node.js code:

```javascript
import { query } from './src/sdk.mjs';

async function example() {
  for await (const event of query({
    prompt: 'List all files in the current directory'
  })) {
    if (event.type === 'assistant') {
      console.log('Response:', event.message.content);
    }
  }
}

example();
```

### Custom Tools

Add custom tools by creating a file in `src/tools/`:

```javascript
export class MyCustomTool {
  constructor() {
    this.name = 'MyTool';
    this.description = 'What this tool does';
    this.inputSchema = {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input parameter' }
      },
      required: ['input']
    };
  }

  async execute(input, context) {
    return {
      type: 'text',
      text: `Processed: ${input.input}`
    };
  }
}
```

Then register it in `src/tools/index.js`.

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Add more tools (NotebookEdit, Agent, etc.)
- [ ] Implement MCP (Model Context Protocol) support
- [ ] Add better error handling
- [ ] Improve streaming performance
- [ ] Add tests
- [ ] Support other local LLM backends (llama.cpp, vLLM, etc.)
- [ ] Implement session resumption
- [ ] Add web search integration
- [ ] Create a GUI version

## 📝 License

MIT

## 🙏 Acknowledgments

- **Anthropic** - For the original Claude Code design and architecture
- **Ollama** - For making local LLM deployment easy
- **Meta**, **Mistral AI**, and other model creators - For open-source LLMs

## 📞 Support

For issues or questions:
1. Check the [USER_GUIDE.md](USER_GUIDE.md)
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. Open an issue on GitHub

---

**Note**: This is an independent implementation inspired by Claude Code. It is not affiliated with or endorsed by Anthropic.

Last Updated: 2025-10-27
