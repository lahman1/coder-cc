# LC-Coder Quick Start

## 🚀 Start Working (2 Commands)

### Terminal 1: Start ChromaDB
```bash
cd /opt/agent/coder-cc
source .venv/bin/activate
chroma run --host localhost --port 8000
```

### Terminal 2: Start LC-Coder
```bash
cd /opt/agent/coder-cc
node src/cli.js
```

---

## 🧪 Next Test to Run

```bash
/multiagent
```

**Test Prompt:**
```
Create comprehensive pytest test cases for WebSocket connections in the FastAPI project at /opt/repos/fastapi.
The tests should cover:
1. Valid message handling
2. Connection closure handling
3. Error conditions

Use async/await patterns and proper fixtures.
```

**Why:** Verify Reviewer V2.2 now passes (previously failed on tool violations)

---

## 📊 Expected Results

- ✅ Explorer: SUCCESS (1 attempt)
- ✅ Planner: SUCCESS (1 attempt)
- ✅ Coder: SUCCESS (within 3 attempts)
- ✅ Reviewer: SUCCESS ← **This should now work with V2.2**

Previous test: Reviewer failed all 3 attempts (tool violations)
Fix applied: Added Glob + RAGQuery to allowed tools

---

## 📁 Where to Look

**Status Doc:** `/opt/agent/coder-cc/CURRENT_STATUS.md` (full details)

**Previous Test:** `/opt/agent/coder-cc/phase3_out1.txt`

**Generated Code:** `/opt/repos/fastapi/tests/test_websocket.py`

**Agent Config:** `/opt/agent/coder-cc/src/agents/reviewer.js:155`

**Boundaries Doc:** `/opt/agent/coder-cc/AGENT_BOUNDARIES_V2.md`

---

## 🔑 Key Info

**RAG Status:** ✅ Fully implemented and indexed
- Indexed repo: `/opt/repos/fastapi` (4096 chunks)
- ChromaDB running on: `localhost:8000`
- Embedding model: Xenova/all-MiniLM-L6-v2 (local)

**Agent Boundaries:** V2.2 (Final)
- Reviewer can now use: Read, Edit, Bash, Grep, **Glob, RAGQuery**, TodoWrite
- Philosophy: More tools → Better output

**Last Change:** 2025-10-29
- Updated Reviewer agent with expanded toolset
- Ready to verify fix works

---

See `CURRENT_STATUS.md` for complete details.
