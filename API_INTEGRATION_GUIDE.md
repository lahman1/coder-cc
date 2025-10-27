# Claude Code API Integration Guide

## Overview
This document details the API integration points where Anthropic API calls are made in Claude Code and how to replace them for local LLM integration.

## 1. SDK IMPORTS AND TYPES

### Core Type Imports
The SDK imports types from the official Anthropic SDK:

```typescript
// From @anthropic-ai/sdk
import type { MessageParam as APIUserMessage } 
    from '@anthropic-ai/sdk/resources';
import type { BetaMessage as APIAssistantMessage, BetaUsage as Usage, BetaRawMessageStreamEvent as RawMessageStreamEvent } 
    from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
import type { CallToolResult } 
    from '@modelcontextprotocol/sdk/types.js';
```

### Key Type Definitions to Replace
- `APIUserMessage` - User message format from Anthropic
- `APIAssistantMessage` - Assistant response from Anthropic
- `Usage` - Token usage tracking
- `RawMessageStreamEvent` - Streaming message events

## 2. MESSAGE FLOW TYPES

### User Message Structure
```typescript
type SDKUserMessage = {
    type: 'user',
    message: APIUserMessage,           // <-- Anthropic type
    parent_tool_use_id: string | null,
    uuid?: UUID,
    session_id: string,
    isSynthetic?: boolean
};
```

**For Local LLM**: Replace `APIUserMessage` with a compatible message format from your local LLM provider (e.g., Ollama, LLaMA.cpp, or OpenAI-compatible format).

### Assistant Message Structure
```typescript
type SDKAssistantMessage = {
    type: 'assistant',
    message: APIAssistantMessage,      // <-- Anthropic type
    parent_tool_use_id: string | null,
    uuid: UUID,
    session_id: string
};
```

**For Local LLM**: Replace `APIAssistantMessage` with the response format from your local LLM.

### Usage Tracking
```typescript
type NonNullableUsage = {
    input_tokens: number,
    output_tokens: number,
    cache_read_input_tokens: number,
    cache_creation_input_tokens: number,
    // ... other fields
};
```

**For Local LLM**: Adapt for local model (which may not provide all these metrics).

## 3. AUTHENTICATION FLOW

### Current Anthropic Authentication

#### OAuth Flow
```
1. User runs 'claude'
2. CLI initiates OAuth at https://console.anthropic.com/oauth/authorize
3. User authorizes the application
4. OAuth token returned to CLI
5. Token stored in ~/.claude/config.json
6. Token used in Authorization headers for API calls
```

#### API Key Alternative
```
1. User sets ANTHROPIC_API_KEY environment variable
2. API key stored in ~/.claude/config.json
3. API key used in x-api-key headers for API calls
```

### Local LLM Authentication

For a local LLM, you might use:
- **No authentication** (localhost only)
- **Simple API key** (environment variable)
- **Token-based** (Bearer token)
- **Custom authentication** (specific to your local setup)

### Environment Variables to Add
```bash
# Local LLM Configuration
LOCAL_LLM_ENDPOINT="http://localhost:8000"
LOCAL_LLM_API_KEY="optional_key"
LOCAL_LLM_MODEL="mistral:7b"

# Alternative: Override Anthropic endpoint for testing
ANTHROPIC_API_BASE_URL="http://localhost:8000"
```

## 4. API CALL PATTERNS

### Expected API Endpoints

Based on the SDK configuration, Anthropic API calls likely follow:

```
Base URL: https://api.anthropic.com/

Endpoints:
- POST /messages (create message/query)
- POST /messages/stream (streaming messages)
- GET /models (list available models)
- GET /account (get account info)
```

### Anthropic Message API Format

The SDK uses the Anthropic Messages API:

```typescript
// Request format (inferred)
{
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 32000,
    messages: [
        {
            role: "user",
            content: "Your prompt here"
        }
    ],
    tools: [
        {
            name: "tool_name",
            description: "Tool description",
            input_schema: { /* JSON Schema */ }
        }
    ],
    temperature?: number,
    thinking?: { type: "enabled", budget_tokens: number }
}

// Response format
{
    id: "message_id",
    type: "message",
    role: "assistant",
    content: [
        { type: "text", text: "response text" },
        { type: "tool_use", id: "...", name: "tool_name", input: {...} }
    ],
    model: "claude-3-5-sonnet-20241022",
    stop_reason: "end_turn" | "tool_use" | "max_tokens",
    usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0
    }
}
```

## 5. MODEL CONFIGURATION

### Supported Claude Models
- `claude-3-5-sonnet-20241022` (latest Sonnet)
- `claude-3-5-haiku-20241022` (latest Haiku)
- `claude-3-opus-20250219` (latest Opus)
- And various regional variants

### Model Selection Logic
```typescript
// Default model selection
type Options = {
    model?: string,              // User specified
    fallbackModel?: string,      // Fallback if primary unavailable
};

// The CLI tracks model usage separately
type ModelUsage = {
    [modelName: string]: {
        inputTokens: number,
        outputTokens: number,
        cacheReadInputTokens: number,
        cacheCreationInputTokens: number,
        webSearchRequests: number,
        costUSD: number,
        contextWindow: number
    }
};
```

### For Local LLM
Map local model names to local model identifiers:

```typescript
// Example mapping
const MODEL_MAPPING = {
    'claude-haiku-4-5': 'mistral:7b',
    'claude-3-5-sonnet': 'mistral:13b',
    'claude-opus-4': 'neural-chat:13b'
};
```

## 6. STREAMING AND REAL-TIME COMMUNICATION

### Streaming Message Events
```typescript
type RawMessageStreamEvent = 
    | { type: 'message_start', message: APIAssistantMessage }
    | { type: 'content_block_start', content_block: { type: string } }
    | { type: 'content_block_delta', delta: { type: string, text?: string } }
    | { type: 'content_block_stop' }
    | { type: 'message_delta', delta: { stop_reason: string } }
    | { type: 'message_stop' };

type SDKPartialAssistantMessage = {
    type: 'stream_event',
    event: RawMessageStreamEvent,
    parent_tool_use_id: string | null
};
```

### Streaming Implementation
The SDK streams responses as they're generated. For local LLM:
- Use Server-Sent Events (SSE) if supported
- Use WebSocket for real-time streaming
- Fall back to buffered responses if streaming unavailable

### Async Iterator Pattern
```typescript
// Query returns an async generator
const query = await query({ prompt: "...", options: {...} });

// Iterate over stream events
for await (const message of query) {
    // Handle different message types
    if (message.type === 'stream_event') {
        // Handle streaming event
    }
}
```

## 7. TOOL EXECUTION AND CALLBACKS

### Tool Use Response
```typescript
type CallToolResult = {
    type: 'text' | 'image' | 'error',
    text?: string,
    image?: { type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: string },
    error?: string
};
```

### Permission Checking
```typescript
// Before tool execution, permission check is called
type CanUseTool = (
    toolName: string,
    input: Record<string, unknown>,
    options: {
        signal: AbortSignal,
        suggestions?: PermissionUpdate[]
    }
) => Promise<PermissionResult>;
```

### Tool Context
The CLI has built-in tools for:
- **File operations**: read, write, edit
- **Code search**: glob patterns, grep
- **Execution**: bash commands
- **Web**: fetch, search
- **Notebooks**: notebook cell editing

## 8. CONFIGURATION FILES AND STORAGE

### Configuration Format
```json
// ~/.claude/.config.json (likely format)
{
    "apiKey": "sk-ant-...",
    "oauthToken": "claude_oauth_token_...",
    "model": "claude-3-5-sonnet-20241022",
    "permissionMode": "default",
    "mcpServers": {
        "example": {
            "type": "stdio",
            "command": "node",
            "args": ["server.js"]
        }
    }
}
```

### For Local LLM
```json
{
    "localLlmEndpoint": "http://localhost:11434",
    "localModel": "mistral:7b",
    "useLocalLlm": true,
    "fallbackToAnthropicApi": false
}
```

## 9. COST TRACKING

### Current Cost Tracking
```typescript
type ModelUsage = {
    costUSD: number,
    inputTokens: number,
    outputTokens: number,
    cacheReadInputTokens: number,
    cacheCreationInputTokens: number,
    webSearchRequests: number,
    contextWindow: number
};

// Anthropic pricing (example rates that might be used)
// Haiku: $0.80 per million input tokens, $4 per million output tokens
// Sonnet: $3 per million input tokens, $15 per million output tokens
// Opus: $15 per million input tokens, $75 per million output tokens
```

### For Local LLM
Option 1: Set cost to zero
```typescript
costUSD: 0
```

Option 2: Track resource usage instead
```typescript
type LocalUsage = {
    computeTime: number,      // milliseconds
    memoryUsed: number,       // MB
    gpuTime?: number
};
```

## 10. SESSION MANAGEMENT

### Session ID Tracking
```typescript
// Each session has a UUID
sessionId: UUID                // Generated at startup
sessionStart: Date
sessionEnd?: Date
sessionDuration: number        // milliseconds
```

### Session Resumption
```typescript
type Options = {
    resume?: string,           // Resume session ID
    resumeSessionAt?: string,  // Resume from specific message ID
    forkSession?: boolean      // Fork as new session instead of continuing
};
```

For local LLM, session files might be stored:
```
~/.claude/sessions/{sessionId}.json
```

## 11. HOOKS AND OBSERVABILITY

### Available Hooks for Integration
```typescript
'PreToolUse'      // -> Can intercept and modify tool inputs
'PostToolUse'     // -> Can log tool outputs
'UserPromptSubmit'// -> Can preprocess user input
'SessionStart'    // -> Can initialize session context
'SessionEnd'      // -> Can cleanup and save session data
'Notification'    // -> System messages
'Stop'            // -> Execution halted
```

### Hook Implementation Pattern
```typescript
type HookCallback = (
    input: HookInput,
    toolUseID: string | undefined,
    options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;

// Example for local logging
const hooks = {
    PostToolUse: [{
        hooks: [async (input, toolUseID, options) => {
            // Log tool execution to local database
            return { suppressOutput: false };
        }]
    }]
};
```

## 12. IMPLEMENTATION CHECKLIST FOR LOCAL LLM

- [ ] Replace Anthropic SDK imports with local LLM client
- [ ] Update authentication (OAuth -> API key or none)
- [ ] Update configuration file structure
- [ ] Map Claude models to local models
- [ ] Implement message format conversion
- [ ] Adapt streaming implementation
- [ ] Update cost tracking (or disable)
- [ ] Test tool execution with local model
- [ ] Configure MCP server for local tools
- [ ] Update error handling for local failures
- [ ] Add local LLM health checks
- [ ] Implement fallback logic
- [ ] Document configuration requirements

## 13. RECOMMENDED LOCAL LLM BACKENDS

### Option 1: Ollama (Recommended for ease)
```bash
# Start local LLM
ollama serve

# API endpoint: http://localhost:11434
# API format: Compatible with OpenAI API
# Models: Mistral, Llama 2, Neural Chat, etc.
```

### Option 2: LLaMA.cpp
```bash
# Start local LLM
./server --port 8000 -m model.gguf

# API endpoint: http://localhost:8000
# API format: OpenAI-compatible
```

### Option 3: Text Generation WebUI
```bash
# Start local LLM
python server.py --listen --api

# API endpoint: http://localhost:5000
# API format: Custom or OpenAI-compatible
```

## 14. TESTING STRATEGY

### Unit Tests
- Test message format conversion
- Test authentication with different backends
- Test tool execution with local model

### Integration Tests
- Test full query flow with local LLM
- Test streaming responses
- Test error handling
- Test session resumption

### Performance Tests
- Measure latency vs Anthropic API
- Test token counting accuracy
- Monitor resource usage

