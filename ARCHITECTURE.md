# Claude Code Architecture Analysis

This document provides a comprehensive overview of the Claude Code (v2.0.23) architecture to assist in creating a local LLM fork.

## 1. PROJECT STRUCTURE

### Technology Stack
- **Language**: JavaScript/TypeScript (ESM modules)
- **Runtime**: Node.js 18+
- **Execution Model**: Minified binary executable
- **Optional Dependencies**: Sharp image processing (cross-platform)

### Key Files
```
@anthropic-ai/claude-code (v2.0.23)
├── cli.js (9.7MB) - Main entry point executable (minified)
├── sdk.mjs (533KB) - SDK implementation
├── sdk.d.ts - TypeScript definitions (445 lines)
├── sdk-tools.d.ts (7.2KB) - Tool definitions (auto-generated from JSON Schema)
├── package.json - Package metadata
├── LICENSE.md - Legal terms
├── README.md - User documentation
├── yoga.wasm - Layout engine
└── vendor/
    └── ripgrep/ - Cross-platform search binary
    └── claude-code-jetbrains-plugin/ - IDE plugin
```

## 2. MAIN ENTRY POINTS

### CLI Entry Point: `/opt/node22/bin/claude`
- Symlink to: `cli.js`
- Executable wrapper around the SDK
- Handles all command-line argument parsing
- Manages interactive user sessions

### SDK Entry Point: `sdk.mjs`
- Main SDK module exported from `@anthropic-ai/claude-code`
- Provides the `query()` function
- Type definitions in `sdk.d.ts`

### Key SDK Export: `query()`
```typescript
export declare function query({
    prompt: string | AsyncIterable<SDKUserMessage>,
    options?: Options
}): Query;
```

## 3. ANTHROPIC API INTEGRATION

### Authentication Methods
The CLI supports multiple authentication approaches:

1. **OAuth Token (Primary)**
   - OAuth flow configuration in CLI
   - Token stored in config files
   - File descriptor passing: `oauthTokenFromFd`

2. **API Key (Fallback)**
   - Retrieved from: `ANTHROPIC_API_KEY` environment variable
   - File descriptor passing: `apiKeyFromFd`
   - API keys stored in configuration files

3. **OAuth Configuration**
   - Base API URL: `https://api.anthropic.com`
   - OAuth Token URL: `https://console.anthropic.com/v1/oauth/token`
   - Authorize URL: `https://console.anthropic.com/oauth/authorize`
   - Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`

### API Types
The SDK imports from Anthropic's official SDK:
```typescript
import type { MessageParam as APIUserMessage } from '@anthropic-ai/sdk/resources';
import type { BetaMessage as APIAssistantMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
```

### Supported Models
The CLI supports multiple Claude models:
- `claude-haiku-4-5`
- `claude-3-5-haiku`
- `claude-3-5-sonnet`
- `claude-3-7-sonnet`
- `claude-opus-4-1`
- `claude-opus-4`
- `claude-sonnet-4-5`
- `claude-sonnet-4`

Model-specific configurations for different cloud providers (Vertex AI, AWS Bedrock).

## 4. CONFIGURATION FILES

### Configuration Directory
- Primary: `~/.claude/` (default)
- Override: `CLAUDE_CONFIG_DIR` environment variable

### Config Files
- `.config.json` - Main configuration
- `.claude.json` - Legacy/alternative config
- Debug logs: `~/.claude/debug/{sessionId}.txt`
- Latest logs symlink: `~/.claude/debug/latest`

### Session Management
- Session ID: UUID generated at runtime
- Storage: In-memory session state during execution
- Persistence: Can resume from previous session IDs

## 5. API CLIENT IMPLEMENTATIONS

### Message Flow Types
```typescript
// User input message
type SDKUserMessage = {
    type: 'user',
    message: APIUserMessage,
    parent_tool_use_id: string | null,
    isSynthetic?: boolean
};

// Assistant response
type SDKAssistantMessage = {
    type: 'assistant',
    message: APIAssistantMessage,
    parent_tool_use_id: string | null
};

// Tool execution result
type SDKResultMessage = {
    type: 'result',
    subtype: 'success' | 'error_max_turns' | 'error_during_execution',
    duration_ms: number,
    usage: NonNullableUsage,
    modelUsage: { [modelName: string]: ModelUsage },
    ...
};
```

### Usage Tracking
```typescript
type ModelUsage = {
    inputTokens: number,
    outputTokens: number,
    cacheReadInputTokens: number,
    cacheCreationInputTokens: number,
    webSearchRequests: number,
    costUSD: number,
    contextWindow: number
};
```

## 6. AUTHENTICATION AND KEY HANDLING

### API Key Sources
```typescript
type ApiKeySource = 'user' | 'project' | 'org' | 'temporary';
type ConfigScope = 'local' | 'user' | 'project';
```

### Key Storage
- **User Settings**: `~/.claude/` directory
- **Project Settings**: `.claude/` in project root
- **Local Settings**: `.claude/` in current directory
- **Flag Settings**: Command-line arguments
- **Policy Settings**: Organization-level policies

### Environment Variables for Auth
- `ANTHROPIC_API_KEY` - Direct API key
- `CLAUDE_CONFIG_DIR` - Configuration directory override
- OAuth tokens passed via file descriptors for security

### Permission System
```typescript
type PermissionBehavior = 'allow' | 'deny' | 'ask';
type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

// Permission check callback
type CanUseTool = (
    toolName: string,
    input: Record<string, unknown>,
    options: { signal: AbortSignal, suggestions?: PermissionUpdate[] }
) => Promise<PermissionResult>;
```

## 7. TOOLS AND CAPABILITIES

### Available Tools (28 tool types via sdk-tools.d.ts)
- **File Operations**: FileEdit, FileRead, FileWrite, Glob, Grep
- **Execution**: Bash, BashOutput, KillShell, Agent, ExitPlanMode
- **Web**: WebFetch, WebSearch
- **Notebook**: NotebookEdit
- **Task Management**: TodoWrite
- **MCP Integration**: Mcp, ListMcpResources, ReadMcpResource

### Tool Input Schema
```typescript
export type ToolInputSchemas =
    | AgentInput
    | BashInput
    | BashOutputInput
    | ExitPlanModeInput
    | FileEditInput
    | FileReadInput
    | FileWriteInput
    | GlobInput
    | GrepInput
    | KillShellInput
    | ListMcpResourcesInput
    | McpInput
    | NotebookEditInput
    | ReadMcpResourceInput
    | TodoWriteInput
    | WebFetchInput
    | WebSearchInput;
```

## 8. MODEL CONTEXT PROTOCOL (MCP) INTEGRATION

### MCP Server Support
```typescript
type McpServerConfig = 
    | McpStdioServerConfig      // stdio transport
    | McpSSEServerConfig        // SSE over HTTP
    | McpHttpServerConfig       // HTTP transport
    | McpSdkServerConfig        // In-process SDK

type McpServerStatus = {
    name: string,
    status: 'connected' | 'failed' | 'needs-auth' | 'pending',
    serverInfo?: { name: string, version: string }
};
```

### Custom Tool Definition
```typescript
type SdkMcpToolDefinition<Schema extends ZodRawShape> = {
    name: string,
    description: string,
    inputSchema: Schema,
    handler: (args: z.infer<ZodObject<Schema>>, extra: unknown) => Promise<CallToolResult>
};

export declare function createSdkMcpServer(options: CreateSdkMcpServerOptions): McpSdkServerConfigWithInstance;
```

## 9. SESSION AND STREAMING

### Query Interface
```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
    // Control methods
    interrupt(): Promise<void>;
    setPermissionMode(mode: PermissionMode): Promise<void>;
    setModel(model?: string): Promise<void>;
    setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>;
    
    // Status methods
    supportedCommands(): Promise<SlashCommand[]>;
    supportedModels(): Promise<ModelInfo[]>;
    mcpServerStatus(): Promise<McpServerStatus[]>;
    accountInfo(): Promise<AccountInfo>;
}
```

### Options Configuration
```typescript
type Options = {
    // Model and execution
    model?: string,
    fallbackModel?: string,
    maxThinkingTokens?: number,
    maxTurns?: number,
    
    // Tool control
    allowedTools?: string[],
    disallowedTools?: string[],
    
    // Permissions
    permissionMode?: PermissionMode,
    canUseTool?: CanUseTool,
    
    // Session
    resume?: string,
    resumeSessionAt?: string,
    forkSession?: boolean,
    
    // Custom configuration
    customSystemPrompt?: string,
    appendSystemPrompt?: string,
    cwd?: string,
    env?: Record<string, string | undefined>,
    
    // MCP Integration
    mcpServers?: Record<string, McpServerConfig>,
    
    // Hooks and callbacks
    hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>,
};
```

## 10. HOOKS AND LIFECYCLE EVENTS

### Hook Events
```typescript
export const HOOK_EVENTS = [
    'PreToolUse',      // Before tool execution
    'PostToolUse',     // After tool execution
    'Notification',    // System notifications
    'UserPromptSubmit',// User input submission
    'SessionStart',    // Session initialization
    'SessionEnd',      // Session termination
    'Stop',           // Execution halt
    'SubagentStop',   // Sub-agent termination
    'PreCompact'      // Before context compaction
] as const;

type HookCallback = (
    input: HookInput,
    toolUseID: string | undefined,
    options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

## 11. DEPRECATION NOTICE

The SDK is transitioning to the Claude Agent SDK:
- Current SDK: `@anthropic-ai/claude-code` (deprecated)
- New SDK: `@anthropic-ai/claude-agent-sdk` (recommended)
- Migration Guide: https://docs.claude.com/en/docs/claude-code/sdk/migration-guide
- Sunset Date: October 21, 2024

## 12. KEY INTEGRATION POINTS FOR LOCAL LLM CLONE

### Areas to Modify for Local LLM Integration

1. **API Client Replacement**
   - Replace Anthropic SDK imports with local LLM client
   - Update authentication from OAuth/API key to local credentials
   - Modify model selection to use local model names

2. **Configuration Updates**
   - Add local LLM endpoint configuration (hostname, port)
   - Store local model preferences
   - Add fallback logic for unavailable models

3. **Message Flow**
   - Update `APIUserMessage` and `APIAssistantMessage` types
   - Adapt usage tracking for local deployment
   - Modify cost tracking (optional for local)

4. **Tool Integration**
   - Most tools can remain unchanged
   - Consider local alternatives for web search/fetch
   - Adapt MCP server handling for local context

5. **Environment Variables**
   - `ANTHROPIC_API_KEY` -> `LOCAL_LLM_KEY` (if needed)
   - `ANTHROPIC_API_BASE` or similar for endpoint configuration
   - Model override environment variables

6. **Authentication**
   - File descriptor-based auth can be replaced
   - OAuth flow can be replaced with simple token/API key
   - Consider local authentication schemes

## 13. EXTERNAL DEPENDENCIES

### Runtime Dependencies
- None listed in package.json (bundled in cli.js)

### Optional Dependencies
- Sharp image library (platform-specific)
  - @img/sharp-darwin-arm64
  - @img/sharp-darwin-x64
  - @img/sharp-linux-arm
  - @img/sharp-linux-arm64
  - @img/sharp-linux-x64
  - @img/sharp-win32-x64

### Vendored Components
- Ripgrep (cross-platform code search)
- Layout engine (yoga.wasm)

## 14. BUILD AND DISTRIBUTION

### Package Info
- **Type**: ES Module (ESM)
- **Main**: sdk.mjs
- **Types**: sdk.d.ts
- **Bin**: claude -> cli.js
- **Engine Requirements**: Node.js >= 18.0.0
- **License**: See README.md (proprietary)

### Distribution Method
- NPM package: `npm install -g @anthropic-ai/claude-code`
- Custom publishing via `publish-external.sh` script
- Authorization required for direct publishing

## NEXT STEPS FOR LOCAL LLM CLONE

1. Extract and analyze the unminified cli.js source
2. Identify all Anthropic API client calls
3. Create abstraction layer for API client
4. Implement local LLM client (using Ollama, LLaMA.cpp, etc.)
5. Update authentication mechanism
6. Test with local model instances
7. Create configuration for model switching
8. Document API compatibility differences

