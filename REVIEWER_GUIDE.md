# Reviewer Agent Guide

## What is the Reviewer Agent?

The Reviewer agent is the 4th stage in the multi-agent pipeline. It validates generated code and automatically fixes common issues.

**Pipeline**: Explorer → Planner → Coder → **Reviewer**

---

## How to Enable

```bash
# In lc-coder interactive mode:
You: /multiagent      # Enable multi-agent mode
You: /reviewer        # Enable reviewer agent
```

Now all multi-agent runs will include validation and auto-fixing!

---

## What the Reviewer Does

### 1. **Validation Checks**
- ✅ Syntax validation (Python: `py_compile`, JS: node --check)
- ✅ Import validation (do imports actually exist?)
- ✅ Test execution (pytest, npm test)

### 2. **Auto-Fixes Common Issues**
- 🔧 Wrong import paths → Searches for correct path with Grep, fixes with Edit
- 🔧 Missing dependencies → Adds imports
- 🔧 Syntax errors → Fixes escaped quotes, indentation
- 🔧 Missing fixtures → Finds and imports them

### 3. **Reports Results**
- 📋 Lists all fixes made
- ⚠️ Reports unfixable issues
- ✅ Confirms if code is ready to use

---

## Tool Boundaries

| Allowed Tools | Forbidden Tools |
|---------------|-----------------|
| Read | Write |
| Edit | |
| Bash | |
| Grep | |
| TodoWrite | |

**Why no Write?** Reviewer's job is to FIX, not CREATE. It only modifies existing files.

---

## Example Workflow

### Without Reviewer (Old Behavior):
```
Explorer → Planner → Coder
                      ↓
                Creates test_websocket.py with import errors
                      ↓
                User sees: ImportError ❌
                User must manually fix
```

### With Reviewer (New Behavior):
```
Explorer → Planner → Coder → Reviewer
                      ↓            ↓
                Creates test     Detects ImportError
                                     ↓
                                 Greps for correct import
                                     ↓
                                 Edits file to fix
                                     ↓
                                 Re-runs pytest
                                     ↓
                                 Reports: "Fixed 2 imports" ✅
```

---

## Validation Strategies

### For Python Files:
1. **Syntax Check**: `python3 -m py_compile file.py`
2. **Run Tests**: `pytest file.py -v`
3. **Check Imports**: Try importing the module

### For JavaScript Files:
1. **Syntax Check**: `node --check file.js`
2. **Run Tests**: `npm test file.js`

---

## Auto-Fix Examples

### Example 1: Import Error
**Error Detected**:
```
ImportError: cannot import name 'echo_handler' from 'websocket_server'
```

**Reviewer's Fix**:
1. Uses Grep: `grep -r "def echo_handler" .`
2. Finds: `src/websocket_server.py`
3. Edits import: `from websocket_server` → `from src.websocket_server`
4. Re-runs test
5. Reports: ✅ "Fixed import path in test_websocket.py"

### Example 2: Missing Module
**Error Detected**:
```
ModuleNotFoundError: No module named 'websockets'
```

**Reviewer's Action**:
1. Checks if module is installable: `pip show websockets`
2. If not installed: Reports to user "Need to install: pip install websockets"
3. If installed: Verifies import path is correct

### Example 3: Missing Fixture
**Error Detected**:
```
NameError: name 'client' is not defined
```

**Reviewer's Fix**:
1. Uses Grep: `grep -r "@pytest.fixture" tests/`
2. Finds: `@pytest.fixture def client()` in `tests/conftest.py`
3. Since it's in conftest.py (auto-imported), removes explicit import
4. OR adds import if needed
5. Re-runs test
6. Reports: ✅ "Fixed fixture reference"

---

## Success Metrics

After implementing Reviewer agent:
- **Before**: 60-70% success rate (files created but may not work)
- **Target**: 80%+ success rate (files created AND work)

---

## Configuration

### Enable by default:
Edit `config.json`:
```json
{
  "enableReviewer": true
}
```

### Enable per-session:
```bash
/reviewer       # Turn on
/noreviewer     # Turn off
```

---

## Limitations

### What Reviewer CAN Fix:
- ✅ Import paths
- ✅ Syntax errors (escaped quotes, etc.)
- ✅ Missing/wrong fixtures
- ✅ Simple logic errors caught by tests

### What Reviewer CANNOT Fix:
- ❌ Complex logic bugs
- ❌ Missing dependencies (needs user to install)
- ❌ Architectural issues
- ❌ Non-existent endpoints/functions (if coder hallucinates)

If Reviewer can't fix after 2 attempts, it reports the issue to the user.

---

## Testing the Reviewer

### Manual Test:
1. Enable multi-agent + reviewer:
   ```
   /multiagent
   /reviewer
   ```

2. Ask for a test that will have issues:
   ```
   Create a test file for WebSocket connections
   ```

3. Watch the Reviewer:
   - See it run pytest
   - See it detect import errors
   - See it grep for correct paths
   - See it edit the file
   - See it re-run tests
   - See final report

---

## Future Enhancements (Phase 3: RAG)

When RAG is added, Reviewer will get even smarter:

- **Query RAG for similar issues**: "How were import errors fixed before?"
- **Learn from past fixes**: Semantic search for similar problems
- **Better fixture detection**: RAG knows all available fixtures
- **Project-specific conventions**: Learns project patterns

---

## Files Modified

- Created: `src/agents/reviewer.js`
- Modified: `src/orchestrator.js` (added reviewer stage)
- Modified: `src/cli.js` (added /reviewer commands)
- Modified: `src/agents/index.js` (export ReviewerAgent)

---

## Phase 2B Complete! ✅

Next: Phase 3 - RAG Integration
