# RAG Setup (ChromaDB)

## Quick Setup

### 1. Install ChromaDB
```bash
# From lc-coder project directory
python3 -m venv .venv
source .venv/bin/activate
pip install chromadb
```

### 2. Start ChromaDB
```bash
source .venv/bin/activate
chroma run --host localhost --port 8000
```

Or in background:
```bash
source .venv/bin/activate
chroma run --host localhost --port 8000 &
```

### 3. Index Your Codebase
```bash
# In lc-coder CLI
/index /path/to/codebase
```

That's it! Now agents can use semantic search with RAGQuery.

## Why Python venv?

✅ Simple - just Python, no Docker
✅ Lightweight - no containers
✅ Consistent - works everywhere
✅ Easy - 3 commands total

## See Also

- **RAG_GUIDE.md** - Complete RAG documentation
- **REVIEWER_GUIDE.md** - Reviewer agent docs
- **IMPLEMENTATION_SUMMARY.md** - Full system overview
