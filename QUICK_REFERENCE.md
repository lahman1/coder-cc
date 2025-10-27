# Claude Code Architecture - Quick Reference

## Installation Location
```
/opt/node22/lib/node_modules/@anthropic-ai/claude-code/
```

## Key Files
| File | Size | Purpose |
|------|------|---------|
| `cli.js` | 9.7 MB | Main executable (minified) |
| `sdk.mjs` | 533 KB | SDK implementation |
| `sdk.d.ts` | 445 lines | TypeScript definitions |
| `sdk-tools.d.ts` | 7.2 KB | Tool type definitions |
| `package.json` | - | Package metadata |

## Core Technology
- **Language**: JavaScript/TypeScript (ESM)
- **Runtime**: Node.js 18+
- **Main Export**: `query()` function from `sdk.mjs`
- **CLI Entry**: `/opt/node22/bin/claude` -> `cli.js`

## API Integration Points

### Authentication
- OAuth tokens via file descriptors: `oauthTokenFromFd`
- API keys via file descriptors: `apiKeyFromFd`
- Environment variable: `ANTHROPIC_API_KEY`
- Config storage: `~/.claude/.config.json`

### Anthropic SDK Imports
```typescript
import { MessageParam as APIUserMessage } from '@anthropic-ai/sdk/resources'
import { BetaMessage as APIAssistantMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
```

### API Endpoints (Likely)
- Base URL: `https://api.anthropic.com/`
- `POST /messages` - Create message
- `POST /messages/stream` - Streaming messages
- `GET /models` - List models
- `GET /account` - Account info

### Supported Models
- `claude-3-5-sonnet-20241022` (Latest)
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20250219`
- `claude-haiku-4-5`
- Plus regional variants for Vertex AI, AWS Bedrock

## Configuration

### Directories
- Config: `~/.claude/` (or `$CLAUDE_CONFIG_DIR`)
- Session files: `~/.claude/sessions/`
- Debug logs: `~/.claude/debug/{sessionId}.txt`

### Environment Variables
- `ANTHROPIC_API_KEY` - API authentication
- `CLAUDE_CONFIG_DIR` - Config directory override
- `AWS_REGION` - AWS Bedrock region
- `VERTEX_REGION_*` - Google Vertex AI regions
- `DEBUG` - Enable debug logging
- `CLAUDE_CODE_MAX_OUTPUT_TOKENS` - Max output (default: 32000)
- `BASH_MAX_OUTPUT_LENGTH` - Bash output limit (default: 30000)

## Message Types

### SDKMessage Union Type
```
SDKAssistantMessage
  ├─ type: 'assistant'
  ├─ message: APIAssistantMessage
  ├─ usage: NonNullableUsage
  └─ parent_tool_use_id: string | null

SDKUserMessage
  ├─ type: 'user'
  ├─ message: APIUserMessage
  └─ parent_tool_use_id: string | null

SDKResultMessage
  ├─ type: 'result'
  ├─ subtype: 'success' | 'error_max_turns' | 'error_during_execution'
  └─ usage: NonNullableUsage

SDKSystemMessage
  ├─ type: 'system'
  └─ subtype: 'init' | 'compact_boundary' | 'hook_response'

SDKPartialAssistantMessage
  ├─ type: 'stream_event'
  └─ event: RawMessageStreamEvent
```

## Available Tools (18 types)
- **File**: FileEdit, FileRead, FileWrite
- **Search**: Glob, Grep
- **Execution**: Bash, BashOutput, KillShell
- **Web**: WebFetch, WebSearch
- **Agent**: Agent, ExitPlanMode
- **Notebook**: NotebookEdit
- **Task**: TodoWrite
- **MCP**: Mcp, ListMcpResources, ReadMcpResource

## Permission System

### Permission Modes
- `default` - Ask for each action
- `acceptEdits` - Auto-accept edits
- `bypassPermissions` - Allow all
- `plan` - Show plan before executing

### Permission Callback
```typescript
type CanUseTool = (
    toolName: string,
    input: Record<string, unknown>,
    options: { signal: AbortSignal, suggestions?: PermissionUpdate[] }
) => Promise<PermissionResult>;
```

## Usage Tracking

### ModelUsage Type
```typescript
{
    inputTokens: number,
    outputTokens: number,
    cacheReadInputTokens: number,
    cacheCreationInputTokens: number,
    webSearchRequests: number,
    costUSD: number,
    contextWindow: number
}
```

### Cost Calculation
- Tokens converted to USD via model-specific rates
- Cache tokens tracked separately
- Web search requests counted

## Hook Events
```
'PreToolUse'       - Before tool execution
'PostToolUse'      - After tool execution
'UserPromptSubmit' - User input submitted
'SessionStart'     - Session initialized
'SessionEnd'       - Session terminated
'Notification'     - System notification
'Stop'             - Execution stopped
'SubagentStop'     - Sub-agent stopped
'PreCompact'       - Before context compaction
```

## MCP Integration

### Server Types
```typescript
McpStdioServerConfig      // stdio transport
McpSSEServerConfig        // SSE over HTTP
McpHttpServerConfig       // HTTP transport
McpSdkServerConfig        // In-process
```

### Status Values
- `'connected'` - Server operational
- `'failed'` - Connection failed
- `'needs-auth'` - Authentication required
- `'pending'` - Connecting

## Session Management

### Options for Sessions
- `resume?: string` - Resume session ID
- `resumeSessionAt?: string` - Resume at specific message
- `forkSession?: boolean` - Fork instead of continue

### Session Tracking
- Session ID: UUID generated per session
- Duration: Tracked from start to end
- Model usage: Tracked per model name
- Cost: Aggregated across all models

## Query Interface

### Control Methods
```typescript
query.interrupt()                              // Stop execution
query.setPermissionMode(mode)                  // Change permission level
query.setModel(model)                          // Switch model
query.setMaxThinkingTokens(tokens | null)      // Control extended thinking
```

### Status Methods
```typescript
query.supportedCommands()    // Available slash commands
query.supportedModels()      // Available models
query.mcpServerStatus()      // MCP server statuses
query.accountInfo()          // User account info
```

## Options Configuration
```typescript
{
    // Model control
    model?: string
    fallbackModel?: string
    maxThinkingTokens?: number
    maxTurns?: number
    
    // Tool control
    allowedTools?: string[]
    disallowedTools?: string[]
    
    // Permissions
    permissionMode?: PermissionMode
    canUseTool?: CanUseTool
    
    // Execution
    cwd?: string
    env?: Record<string, string>
    executable?: 'bun' | 'deno' | 'node'
    
    // Session
    resume?: string
    resumeSessionAt?: string
    forkSession?: boolean
    
    // Customization
    customSystemPrompt?: string
    appendSystemPrompt?: string
    
    // MCP
    mcpServers?: Record<string, McpServerConfig>
    
    // Hooks
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>
}
```

## Local LLM Migration Path

### 1. Replace SDK Imports
- `@anthropic-ai/sdk` -> Your LLM client library

### 2. Update Types
- `APIUserMessage` -> Your format
- `APIAssistantMessage` -> Your format
- `NonNullableUsage` -> Your usage format

### 3. Configuration Changes
```json
{
    "useLocalLLM": true,
    "localEndpoint": "http://localhost:11434",
    "localModel": "mistral:7b",
    "fallbackToAPI": false
}
```

### 4. Environment Variables
```bash
LOCAL_LLM_ENDPOINT="http://localhost:11434"
LOCAL_LLM_MODEL="mistral:7b"
# Remove: ANTHROPIC_API_KEY
```

### 5. Test Points
- Message format conversion
- Streaming responses
- Tool execution
- Cost/usage tracking (optional)
- Session resumption

## Recommended Local LLM Backends

1. **Ollama** (Easiest)
   - Endpoint: `http://localhost:11434`
   - Format: OpenAI-compatible API
   - Models: Mistral, Llama 2, Neural Chat

2. **LLaMA.cpp**
   - Endpoint: `http://localhost:8000`
   - Format: OpenAI-compatible
   - Models: GGUF files

3. **Text Generation WebUI**
   - Endpoint: `http://localhost:5000`
   - Format: Custom or OpenAI-compatible
   - Models: Any supported

## Deprecation Notice
- **Current**: `@anthropic-ai/claude-code` (v2.0.23)
- **New**: `@anthropic-ai/claude-agent-sdk` (recommended)
- **Sunset**: October 21, 2024

## Documentation Files in This Repo

1. **ARCHITECTURE.md** - Comprehensive architecture overview
2. **API_INTEGRATION_GUIDE.md** - Detailed API integration points
3. **QUICK_REFERENCE.md** - This file (quick lookup)

