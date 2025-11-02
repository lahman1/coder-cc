# LC-Coder - Local Coding Assistant

A **complete, working local coding assistant** that runs 100% locally using Ollama. This is a full-featured AI coding assistant powered by local open-source models, with capabilities similar to Claude Code but running entirely on your machine.

## 🚀 Features

- ✅ **100% Local & Private** - No data sent to external servers
- ✅ **Free to Use** - No API costs
- ✅ **Offline Capable** - Works without internet
- ✅ **All Tools Implemented** - Bash, Read, Write, Edit, Glob, Grep, WebFetch, TodoWrite, and more
- ✅ **Streaming Responses** - Real-time output as the model generates
- ✅ **Session Management** - Save and resume conversations with `/sessions` and `/resume`
- ✅ **Multiple Model Support** - Use any Ollama model (Mistral, Llama, CodeLlama, etc.)
- ✅ **Interactive & Non-Interactive Modes** - REPL or single commands
- ✅ **Enhanced Mode** - Advanced features to match Claude Code's effectiveness:
  - 🎯 **Task Completion Focus** - Never just explains, always completes the work
  - 🔍 **Automatic Verification** - Verifies all file operations and command outputs
  - 🔄 **Smart Retry Logic** - Intelligently retries with alternative approaches on failure
  - 📊 **Quality Checks** - Validates code quality and completeness
- ✅ **Multi-Agent Mode** - Orchestrated pipeline with specialized agents (Explorer → Planner → Coder → Reviewer)
- ✅ **RAG Support** - Index and query codebases using ChromaDB for semantic search
- ✅ **Test Suite** - Comprehensive test coverage with `npm test`
- ✅ **Platform Detection** - Automatic detection of Windows, macOS, or Linux with appropriate commands

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
- `/sessions` - List saved sessions
- `/resume <id>` - Resume a previous session
- `/multiagent` - Enable multi-agent mode (Explorer → Planner → Coder)
- `/singleagent` - Disable multi-agent mode (default)
- `/reviewer` - Enable reviewer agent (validation & auto-fixing)
- `/noreviewer` - Disable reviewer agent (default)
- `/index [path]` - Index codebase for RAG (requires ChromaDB)
- `/exit` or `exit` - Exit the program

## ⚙️ Configuration

Configuration is stored in `config.json` in the project root directory:

```json
{
  "ollamaEndpoint": "http://localhost:11434",
  "ollamaModel": "qwen3:32b",
  "temperature": 0.7,
  "maxTokens": 32000,
  "debugTools": false,
  "debug": false,
  "bashMaxOutputLength": 30000,
  "enableSessionResume": true
}
```

**To get started:**
1. Copy `config.example.json` to `config.json`
2. Modify settings as needed (model name, endpoint, etc.)
3. Set `debugTools: true` to see detailed Ollama responses during development

## 🧪 Testing

Run the test suite to verify everything is working:

```bash
npm test
```

The test suite includes:
- Configuration management tests
- Session management tests
- Ollama client integration tests
- Tool functionality tests
- Platform detection tests

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
│   ├── orchestrator.js     # Multi-agent orchestrator
│   ├── config.js           # Configuration management
│   ├── session.js          # Session management
│   ├── agents/             # Specialized agents
│   │   ├── base-agent.js   # Base agent class
│   │   ├── explorer.js     # Code exploration agent
│   │   ├── planner.js      # Task planning agent
│   │   ├── coder.js        # Code implementation agent
│   │   └── reviewer.js     # Code review agent
│   ├── rag/                # RAG implementation
│   │   ├── indexer.js      # Codebase indexer
│   │   └── query.js        # Semantic query
│   └── tools/              # Tool implementations
│       ├── index.js        # Tool registry
│       ├── bash.js         # Bash tool
│       ├── read.js         # Read file tool
│       ├── write.js        # Write file tool
│       ├── edit.js         # Edit file tool
│       ├── glob.js         # File pattern matching
│       ├── grep.js         # Text search tool
│       ├── todo-write.js   # Task management
│       ├── rag-query.js    # RAG query tool
│       ├── web-fetch.js    # Web fetching
│       └── web-search.js   # Web search
├── test/                   # Test suite
│   ├── test-runner.js      # Test runner
│   ├── test-config.js      # Config tests
│   ├── test-session.js     # Session tests
│   ├── test-ollama-client.js # Client tests
│   ├── test-tools.js       # Tool tests
│   └── test-platform-detection.js # Platform tests
├── .sessions/              # Saved sessions (auto-created)
├── .debug/                 # Debug logs (auto-created)
├── package.json
├── config.json             # User configuration
├── config.example.json     # Example configuration
├── README.md
├── USER_GUIDE.md
└── CLAUDE.md              # Project instructions for Claude
```

## 🚀 Enhanced Mode

Enhanced Mode helps local LLMs achieve results closer to Claude Code by providing:

### Key Features

1. **Task Completion Focus** - The model is prompted to always complete tasks, not just explain them
2. **Automatic Verification** - Every file operation is verified to ensure it succeeded
3. **Smart Retry** - When operations fail, the system analyzes errors and tries alternative approaches
4. **Quality Checks** - Code is checked for completeness (no TODO placeholders)

### Using Enhanced Mode

Enhanced mode is **enabled by default**. You can toggle it with:

```
You: /enhanced    # Enable enhanced mode
You: /basic       # Disable enhanced mode
```

### How It Helps

When enhanced mode is active:
- File writes are automatically verified
- Failed operations are retried with different approaches
- Missing directories are created automatically
- Command errors trigger alternative commands
- The model is strongly prompted to complete work

### Example

Without enhanced mode:
```
You: Create a test file
Assistant: You can create a test file using the Write tool...
```

With enhanced mode:
```
You: Create a test file
Assistant: I'll create that test file now.
[Tool: Write]
✓ File created and verified
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

## 🆚 Comparison: Cloud AI vs LC-Coder

| Feature | Cloud AI Services | LC-Coder |
|---------|-------------------|----------|
| **LLM Backend** | Cloud API (GPT/Claude/etc) | Ollama (Local Models) |
| **Privacy** | Data sent to providers | 100% local |
| **Cost** | Pay per token (~$3-15/1M tokens) | Free |
| **Speed** | Network latency | Local hardware speed |
| **Offline** | No | Yes |
| **Authentication** | API Key required | None required |
| **Model Choice** | Provider-specific | Any Ollama model |
| **Quality** | Very high | Depends on model (7B-70B+) |

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

- **Ollama** - For making local LLM deployment easy
- **Meta**, **Mistral AI**, **Alibaba (Qwen)** and other model creators - For open-source LLMs
- **Anthropic** - For inspiration from Claude Code's architecture

## 📞 Support

For issues or questions:
1. Check the [USER_GUIDE.md](USER_GUIDE.md)
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. Open an issue on GitHub

---

**Note**: LC-Coder is an independent local coding assistant. It is not affiliated with or endorsed by Anthropic.

Last Updated: 2025-10-29
