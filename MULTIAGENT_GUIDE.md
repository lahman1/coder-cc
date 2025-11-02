# Multi-Agent System Guide

## Overview

The multi-agent orchestrator enforces a structured pipeline that FORCES each agent to complete its specific task before moving to the next stage. This solves the "summarizer not doer" problem by architecturally enforcing deliverable creation.

## Architecture

```
User Request
     ↓
┌─────────────────────────────────────┐
│  ORCHESTRATOR                       │
│  - Manages pipeline                 │
│  - Validates each stage             │
│  - Retries on failure               │
│  - User intervention if needed      │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  STAGE 1: EXPLORER                  │
│  Tools: Glob, Grep, Read, Bash      │
│  Output: Files, snippets, summary   │
│  Validation: Must find files        │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  STAGE 2: PLANNER                   │
│  Tools: TodoWrite (REQUIRED)        │
│  Output: Task checklist             │
│  Validation: Must create 2+ todos   │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│  STAGE 3: CODER                     │
│  Tools: Write, Edit, Read           │
│  Output: Created/modified files     │
│  Validation: Must create files      │
└─────────────────────────────────────┘
```

## Key Features

### 1. **Hard Validation**
Each agent MUST produce specific outputs:
- Explorer: Must find relevant files
- Planner: Must create TodoWrite checklist with 2+ items
- Coder: Must use Write/Edit tool to create files

If validation fails, agent is retried with stronger prompt.

### 2. **Retry Logic**
- Each agent gets 3 attempts (1 initial + 2 retries)
- Retries include stronger prompting
- After all retries fail, user is asked for intervention

### 3. **Context Accumulation**
Each agent receives full context from previous stages:
- Planner gets exploration results
- Coder gets exploration + plan
- Prevents information loss

### 4. **Tool Restrictions**
Agents are restricted to specific tools:
- Explorer CAN'T write code
- Planner CAN ONLY use TodoWrite
- Coder CAN'T explore (already has context)

### 5. **Extensible Pipeline**
Easy to add new stages (e.g., Reviewer agent):
```javascript
this.stages = [
  { name: 'explorer', agent: new ExplorerAgent(), required: true },
  { name: 'planner', agent: new PlannerAgent(), required: true },
  { name: 'coder', agent: new CoderAgent(), required: true },
  { name: 'reviewer', agent: new ReviewerAgent(), required: false },
];
```

## Usage

### Enable Multi-Agent Mode

```bash
lc-coder
You: /multiagent
✅ Multi-agent mode ENABLED
You: I want to add unit tests for WebSocket handling
```

### Disable Multi-Agent Mode

```bash
You: /singleagent
✅ Multi-agent mode DISABLED
```

### Full Example Session

```bash
$ lc-coder
LC-Coder - Local Coding Assistant
==================================

Interactive mode - Type your questions or "exit" to quit
💡 Tip: Use /multiagent for complex coding tasks (experimental)

You: /multiagent
✅ Multi-agent mode ENABLED

You: Add comprehensive unit tests for WebSocket error handling in FastAPI

🤖 Launching multi-agent pipeline...

╔════════════════════════════════════════════════════════════╗
║          Multi-Agent Orchestrator Starting                ║
╚════════════════════════════════════════════════════════════╝

┌─ STAGE: EXPLORER ─────────────────────────────────────────┐

[Explorer Agent] Starting...
[Explorer Agent] Used tool: Glob
[Explorer Agent] Used tool: Read
[Explorer Agent] Used tool: Read
[Explorer Agent] Completed

└─ EXPLORER COMPLETED ✓ ───────────────────────────────────┘

┌─ STAGE: PLANNER ──────────────────────────────────────────┐

[Planner Agent] Starting...
[Planner Agent] Used tool: TodoWrite
[Planner Agent] Completed

└─ PLANNER COMPLETED ✓ ────────────────────────────────────┘

┌─ STAGE: CODER ────────────────────────────────────────────┐

[Coder Agent] Starting...
[Coder Agent] Used tool: Read
[Coder Agent] Used tool: Write
[Coder Agent] Used tool: TodoWrite
[Coder Agent] Completed

└─ CODER COMPLETED ✓ ──────────────────────────────────────┘

╔════════════════════════════════════════════════════════════╗
║          Multi-Agent Pipeline Completed ✓                  ║
╚════════════════════════════════════════════════════════════╝

============================================================
PIPELINE SUMMARY
============================================================
Success: ✅
Stages completed: 3/3

Files created:
  ✓ tests/test_websocket_errors.py

============================================================
```

## Testing the Multi-Agent System

### Test 1: FastAPI WebSocket Tests

```bash
cd /opt/repos/fastapi
lc-coder
You: /multiagent
You: I want to add comprehensive unit tests for the WebSocket connection handling. First, analyze the existing WebSocket implementation to understand how connections are managed, then identify what test coverage currently exists. Finally, suggest 3-5 specific test cases that would improve coverage and create one example test that demonstrates proper async WebSocket testing patterns.
```

**Expected:**
- Explorer finds WebSocket files and existing tests
- Planner creates checklist with specific test cases
- Coder generates complete test file
- File has actual test code, not explanations

### Test 2: Apache Commons Lang StringUtils

```bash
cd /opt/repos/commons-lang
lc-coder
You: /multiagent
You: Analyze the StringUtils class and identify any methods that lack sufficient edge case testing. Pick one method that needs better test coverage, explain what edge cases are missing, and write a complete JUnit test class that covers those cases.
```

**Expected:**
- Explorer analyzes StringUtils and existing tests
- Planner breaks down task into steps
- Coder creates complete JUnit test class

### Test 3: nlohmann/json C++ Library

```bash
cd /opt/repos/json
lc-coder
You: /multiagent
You: I want to understand how this library handles parsing errors. Find the error handling implementation, identify the different types of parse exceptions that can be thrown, and create a small example program with unit tests that demonstrates proper error handling for malformed JSON input.
```

**Expected:**
- Explorer finds exception handling code
- Planner creates checklist for .h, .cpp, and test files
- Coder generates all files with working C++ code

## Troubleshooting

### Agent Validation Failures

If an agent fails validation after 3 attempts, you'll be prompted:

```
╔════════════════════════════════════════════════════════════╗
║  PLANNER AGENT NEEDS HELP
╚════════════════════════════════════════════════════════════╝

Error: TodoWrite was called but no valid todos were created.

Options:
  1. Continue anyway (skip validation)
  2. Abort pipeline
  3. Manually provide a todo checklist

Your choice (1-2):
```

**Option 1:** Skip validation and continue (risky)
**Option 2:** Stop the pipeline
**Option 3:** Manually provide todos (for Planner failures)

### Common Issues

**Explorer finds no files:**
- Check that you're in the right directory
- Try more general search terms
- Consider manual exploration first

**Planner doesn't create todos:**
- Task might be too simple (use single-agent mode)
- Model might not understand requirement
- Use manual todo intervention

**Coder doesn't create files:**
- Check that Write tool is available
- Verify file paths are correct
- Review validation logic (might be too strict)

## Comparison: Single-Agent vs Multi-Agent

| Feature | Single-Agent | Multi-Agent |
|---------|--------------|-------------|
| Best for | Simple queries, exploration | Complex coding tasks |
| Conversation | Yes, maintains context | No, one-shot pipeline |
| Deliverables | Sometimes | Always (enforced) |
| Speed | Faster | Slower (3 stages) |
| Reliability | Model-dependent | Architecture-enforced |

## Next Steps: RAG Integration

After multi-agent is working well, we'll add:
1. **ChromaDB** for codebase indexing
2. **Function-based chunking** for better context
3. **Enhanced Explorer** with semantic search
4. **Smarter context** for Planner and Coder

## Architecture Files

```
src/
├── orchestrator.js          # Main pipeline manager
├── agents/
│   ├── index.js            # Agent registry
│   ├── base-agent.js       # Base agent class
│   ├── explorer.js         # Stage 1: Exploration
│   ├── planner.js          # Stage 2: Planning
│   └── coder.js            # Stage 3: Coding
├── cli.js                  # Updated with /multiagent command
└── sdk.mjs                 # Unchanged
```

## Success Metrics

Compare multi-agent vs single-agent on same prompts:

**Single-Agent (Old):**
- ❌ Stops after explaining
- ❌ No files created
- ❌ ~30% task completion

**Multi-Agent (New):**
- ✅ Must create files (validated)
- ✅ Follows structured workflow
- ✅ Target: 70-80% task completion

**How to measure:**
Run comparison tests and count:
1. Did it create files? (Yes/No)
2. Are files complete? (1-10 score)
3. Does code work? (Yes/No)
4. Follows conventions? (Yes/No)
