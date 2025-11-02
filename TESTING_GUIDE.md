# LC-Coder Phase 1 Testing Guide

## What Changed

### 1. **Enhanced System Prompt** (src/cli.js)
- Added explicit 4-stage workflow: UNDERSTAND → PLAN → EXECUTE → VERIFY
- Emphasized creating deliverables, not just explanations
- Added TodoWrite usage examples
- Included concrete workflow examples

### 2. **Improved Tool Descriptions**
- **Write tool**: Emphasizes creating deliverables
- **Edit tool**: Clarifies when to modify existing files
- **TodoWrite tool**: Encourages use at START of complex tasks

### 3. **Enhanced Tool Feedback** (src/sdk.mjs)
- Tool results now include context reminders
- Prompts to continue with workflow stages
- Reminds to complete ALL checklist items

### 4. **Model & Configuration** (config.json)
- Switched from `qwen3:32b` → `qwen2.5-coder:32b-instruct`
- Lowered temperature from `0.7` → `0.5` (more focused)

---

## How to Test

### Quick Test
Run lc-coder with a simple task to verify it works:

```bash
cd /opt/repos/fastapi
lc-coder "Find all WebSocket-related files in this project and list them"
```

Expected: Should use Glob/Grep and list files

### Full Comparison Test

Test with the same prompts we used before to compare results:

#### Test 1: FastAPI WebSocket Testing

```bash
cd /opt/repos/fastapi
lc-coder "I want to add comprehensive unit tests for the WebSocket connection handling. First, analyze the existing WebSocket implementation to understand how connections are managed, then identify what test coverage currently exists. Finally, suggest 3-5 specific test cases that would improve coverage and create one example test that demonstrates proper async WebSocket testing patterns."
```

**What to look for:**
- ✅ Creates TodoWrite checklist
- ✅ Reads WebSocket implementation files
- ✅ Analyzes existing tests
- ✅ **CREATES actual test file** (most important!)
- ✅ Test file has complete, working code

#### Test 2: Apache Commons Lang StringUtils

```bash
cd /opt/repos/commons-lang
lc-coder "Analyze the StringUtils class and identify any methods that lack sufficient edge case testing. Pick one method that needs better test coverage, explain what edge cases are missing, and write a complete JUnit test class that covers those cases. Make sure the tests follow the project's existing test conventions."
```

**What to look for:**
- ✅ Analyzes StringUtils methods
- ✅ Identifies specific method needing tests
- ✅ **CREATES complete JUnit test class**
- ✅ Test class has multiple test methods
- ✅ Follows Apache project conventions

#### Test 3: nlohmann/json C++ Library

```bash
cd /opt/repos/json
lc-coder "I want to understand how this library handles parsing errors. Find the error handling implementation, identify the different types of parse exceptions that can be thrown, and create a small example program with unit tests that demonstrates proper error handling for malformed JSON input. Use the project's build system and testing framework."
```

**What to look for:**
- ✅ Finds exception handling code
- ✅ Explains exception types
- ✅ **CREATES example program files** (.h and .cpp)
- ✅ **CREATES test file**
- ✅ Demonstrates all exception types

---

## Success Criteria

### Baseline (Must Have)
- ✅ Uses TodoWrite for complex tasks
- ✅ Creates at least one code file (not just explanations)
- ✅ File has complete, compilable/runnable code

### Good (50-70% improvement)
- ✅ Creates all requested deliverables
- ✅ Code is mostly complete (may need minor edits)
- ✅ Follows project conventions reasonably well

### Excellent (80%+ improvement)
- ✅ Creates production-ready code files
- ✅ Multiple test cases/functions
- ✅ Perfectly follows project conventions
- ✅ Comparable to Claude Code output

---

## Comparison Format

Save outputs to comparison files:

```bash
# Test 1 output
lc-coder "[prompt]" > /opt/agent/fastapi_phase1_test.txt

# Compare to original
diff /opt/agent/fastapi_compare.txt /opt/agent/fastapi_phase1_test.txt
```

---

## Rollback Instructions

If Phase 1 changes make things worse, rollback:

```bash
cd /opt/agent/coder-cc
git checkout src/cli.js src/sdk.mjs src/tools/write.js src/tools/edit.js src/tools/todo-write.js config.json
```

Or manually change config.json back to:
```json
{
  "ollamaModel": "qwen3:32b",
  "temperature": 0.7
}
```

---

## Next Steps

Based on test results:

### If 50-70% Improvement:
✅ **Phase 1 Success!** Document improvements and iterate on prompt refinements.

### If 30-50% Improvement:
⚠️ **Partial Success** - Consider:
- Adjusting temperature (try 0.3 for even more focus)
- Adding more explicit examples to system prompt
- Testing other models (deepseek-coder, codellama)

### If <30% Improvement:
❌ **Move to Phase 2** - Build true multi-agent orchestrator system
