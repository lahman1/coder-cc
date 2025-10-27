# Claude Code Architecture Analysis - Complete Index

## Repository Contents

This repository contains a comprehensive analysis of Claude Code v2.0.23's architecture to facilitate understanding and adaptation for local LLM use.

### All Documentation Files

#### 1. **ANALYSIS_SUMMARY.txt** (Executive Summary)
A comprehensive single-file overview covering:
- All key findings in one document
- Complete API integration point summary
- Local LLM integration path
- Configuration details
- Architecture highlights
- Implementation checklist
- Recommended next steps

**Read this first if:** You want a complete overview in one document

---

#### 2. **README.md** (Project Overview)
Main repository documentation including:
- Documentation guide with descriptions
- Key findings summary
- API integration points overview
- Configuration file locations
- Available tools list
- Local LLM integration steps
- Architecture pattern diagrams
- Environment variables reference
- Next steps for local LLM fork

**Read this if:** You want to understand the project structure and navigate the documentation

---

#### 3. **ARCHITECTURE.md** (Deep Technical Dive)
Comprehensive architecture document covering 14 sections:
- Project structure and technology stack
- Main entry points (CLI, SDK)
- Anthropic API integration (auth, endpoints, models)
- Configuration files and storage
- API client implementations
- Authentication and API key handling
- Tools and capabilities (18 tool types)
- Model Context Protocol integration
- Session and streaming mechanisms
- Hooks and lifecycle events
- Deprecation notice
- Integration points for local LLM
- External dependencies
- Build and distribution

**Read this if:** You want to understand the complete system architecture

---

#### 4. **API_INTEGRATION_GUIDE.md** (Implementation Reference)
Technical implementation guide with 14 sections:
- SDK imports and type definitions
- Message flow types and structures
- Complete authentication flows
- API call patterns and endpoints
- Model configuration and selection
- Streaming and real-time communication
- Tool execution and callbacks
- Configuration file formats
- Cost tracking mechanisms
- Session management
- Hooks and observability
- Implementation checklist (13 items)
- Recommended local LLM backends
- Testing strategy

**Read this if:** You're implementing local LLM integration and need technical details

---

#### 5. **QUICK_REFERENCE.md** (Quick Lookup)
Condensed reference guide for quick lookups:
- Installation location and key files
- Core technology summary
- API integration point summary
- Authentication methods
- Configuration directories
- Environment variables table
- Message type hierarchy
- Available tools list
- Permission system modes
- Usage tracking types
- Hook events list
- MCP server types
- Query interface methods
- Options configuration object
- Local LLM migration path
- Recommended backends

**Use this if:** You need quick reference during development

---

## How to Use These Documents

### For Quick Understanding (15 minutes)
1. Read this INDEX.md
2. Skim ANALYSIS_SUMMARY.txt sections 2-6

### For Complete Overview (1-2 hours)
1. Read README.md
2. Read ANALYSIS_SUMMARY.txt
3. Quick scan of ARCHITECTURE.md table of contents

### For Implementation (2-5 days)
1. Start with README.md
2. Study ARCHITECTURE.md sections 1-8
3. Reference API_INTEGRATION_GUIDE.md for details
4. Use QUICK_REFERENCE.md during coding

### For Specific Information
- **Architecture questions?** → ARCHITECTURE.md
- **API details?** → API_INTEGRATION_GUIDE.md
- **Quick lookup?** → QUICK_REFERENCE.md
- **Configuration?** → ARCHITECTURE.md section 4 or API_INTEGRATION_GUIDE.md section 8
- **Local LLM setup?** → API_INTEGRATION_GUIDE.md sections 13-14
- **Tool list?** → QUICK_REFERENCE.md Tools section

## Key Information at a Glance

### Installation Location
```
/opt/node22/lib/node_modules/@anthropic-ai/claude-code/
```

### Entry Point
```
/opt/node22/bin/claude → cli.js
```

### Main Files
- **cli.js** - 9.7 MB minified executable
- **sdk.mjs** - 533 KB SDK implementation
- **sdk.d.ts** - 445 lines of TypeScript definitions
- **sdk-tools.d.ts** - Tool type definitions

### Technology
- JavaScript/TypeScript (ESM)
- Node.js 18+
- Minified CLI executable

### API Integration
- **Type:** REST API to Anthropic's servers
- **Authentication:** OAuth tokens or API keys
- **Base URL:** https://api.anthropic.com/
- **Main endpoint:** POST /messages

### Local LLM Options
1. **Ollama** (Recommended) - http://localhost:11434
2. **LLaMA.cpp** - http://localhost:8000
3. **Text Generation WebUI** - http://localhost:5000

## Quick Navigation

| Question | File | Section |
|----------|------|---------|
| What is Claude Code? | README.md | Overview |
| How is it architected? | ARCHITECTURE.md | Sections 1-3 |
| How does it call APIs? | API_INTEGRATION_GUIDE.md | Sections 3-5 |
| Where is configuration? | ARCHITECTURE.md | Section 4 |
| How to adapt for local LLM? | API_INTEGRATION_GUIDE.md | Section 12-13 |
| What tools are available? | QUICK_REFERENCE.md | Tools section |
| What are the models? | QUICK_REFERENCE.md | Supported Models |
| How does authentication work? | API_INTEGRATION_GUIDE.md | Section 3 |
| What is MCP? | ARCHITECTURE.md | Section 8 |
| How are sessions managed? | ARCHITECTURE.md | Section 9 |
| What are the hooks? | QUICK_REFERENCE.md | Hook Events |

## File Sizes and Statistics

| File | Size | Lines | Purpose |
|------|------|-------|---------|
| README.md | 8.1 KB | ~300 | Project overview |
| ARCHITECTURE.md | 12 KB | ~400 | System architecture |
| API_INTEGRATION_GUIDE.md | 12 KB | ~450 | Technical guide |
| QUICK_REFERENCE.md | 7.8 KB | ~400 | Quick lookup |
| ANALYSIS_SUMMARY.txt | 8.5 KB | ~350 | Executive summary |
| **Total** | **~48 KB** | **~1900** | Complete analysis |

## Tools and Features Documented

### File Tools
- FileEdit, FileRead, FileWrite

### Search Tools
- Glob, Grep

### Execution Tools
- Bash, BashOutput, KillShell

### Web Tools
- WebFetch, WebSearch

### Agent Tools
- Agent, ExitPlanMode

### Data Tools
- Notebook (NotebookEdit), Task (TodoWrite)

### Integration Tools
- MCP, ListMcpResources, ReadMcpResource

## Environment Variables Reference

### Authentication
- `ANTHROPIC_API_KEY` - API key for Anthropic

### Configuration
- `CLAUDE_CONFIG_DIR` - Config directory location

### Execution
- `CLAUDE_CODE_MAX_OUTPUT_TOKENS` - Output limit (default: 32000)
- `BASH_MAX_OUTPUT_LENGTH` - Bash output limit (default: 30000)
- `DEBUG` - Enable debug logging

### Cloud Providers
- `AWS_REGION` - AWS Bedrock region
- `VERTEX_REGION_*` - Google Vertex AI regions

## API Endpoints Summary

```
Base URL: https://api.anthropic.com/

POST /messages
- Create a new message/query
- Body: { model, messages, max_tokens, tools?, ... }
- Returns: Message with content and usage

POST /messages/stream
- Stream message responses
- Same body as /messages
- Returns: Server-sent events

GET /models
- List available models
- Returns: Model list with metadata

GET /account
- Get account information
- Returns: User details, subscription info
```

## Implementation Checklist

For adapting Claude Code to use a local LLM, the checklist includes:

- [ ] Replace Anthropic SDK imports
- [ ] Update type definitions
- [ ] Modify authentication
- [ ] Update configuration
- [ ] Map models
- [ ] Convert message formats
- [ ] Implement streaming
- [ ] Update cost tracking
- [ ] Test tool execution
- [ ] Handle errors
- [ ] Add health checks
- [ ] Implement fallback
- [ ] Document setup

(See API_INTEGRATION_GUIDE.md Section 12 for complete details)

## Notes and Disclaimers

### Important Information
- Claude Code v2.0.23 is **deprecated** (sunset October 21, 2024)
- Use **@anthropic-ai/claude-agent-sdk** for new projects
- CLI is **minified** (9.7 MB) - source not easily readable
- This is **not official** Claude Code documentation
- Analysis based on type definitions and public sources

### Limitations
- Cannot directly analyze minified cli.js source
- API endpoints are inferred from SDK usage
- Exact implementation details may vary
- This is for **educational purposes only**

## References

- **Official Claude Code**: https://docs.claude.com/en/docs/claude-code/overview
- **GitHub Repository**: https://github.com/anthropics/claude-code
- **NPM Package**: https://www.npmjs.com/package/@anthropic-ai/claude-code
- **Migration Guide**: https://docs.claude.com/en/docs/claude-code/sdk/migration-guide
- **Discord Community**: https://anthropic.com/discord

## Document Metadata

- **Analysis Date**: 2025-10-27
- **Tool Version**: @anthropic-ai/claude-code v2.0.23
- **Analysis Scope**: Very thorough
- **Total Documentation**: ~48 KB
- **Total Lines of Analysis**: ~1900

---

**Start with README.md and use this INDEX for navigation.**

For quick information, use QUICK_REFERENCE.md.
For implementation details, refer to API_INTEGRATION_GUIDE.md.
For complete understanding, review ARCHITECTURE.md.

