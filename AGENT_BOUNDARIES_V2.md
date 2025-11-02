# Agent Tool Boundaries - Version 2.2 (Final)

## Updated: 2025-10-29

## Evolution of Boundaries

**V1 (Too Strict):**
- Planner: TodoWrite ONLY ❌
- Coder: Write, Edit, Read, TodoWrite ONLY ❌
- Reviewer: Read, Edit, Bash, Grep, TodoWrite ONLY ❌

**V2 (Better):**
- Planner: Read, Glob, Grep, TodoWrite ✅
- Coder: Write, Edit, Read, TodoWrite (still too strict) ⚠️
- Reviewer: Read, Edit, Bash, Grep, TodoWrite ⚠️

**V2.1 - Option C:**
- Planner: Read, Glob, Grep, TodoWrite ✅
- Coder: Write, Edit, Read, Glob, Grep, TodoWrite ✅
- Reviewer: Read, Edit, Bash, Grep, TodoWrite (still too strict) ⚠️

**V2.2 - Final (Current):**
- Planner: Read, Glob, Grep, RAGQuery, TodoWrite ✅
- Coder: Write, Edit, Read, Glob, Grep, RAGQuery, TodoWrite ✅
- Reviewer: Read, Edit, Bash, Grep, **Glob, RAGQuery**, TodoWrite ✅

**Rationale:**
- Planner needs to read context to create informed plans
- Coder needs to search (Glob/Grep/RAG) to find correct patterns and locations
- **Reviewer needs to find files (Glob) and query patterns (RAG) to fix issues effectively**
- Key boundaries:
  - Coder can SEARCH but not EXECUTE (Bash forbidden)
  - Reviewer can SEARCH and EXECUTE but not CREATE (Write forbidden)

---

## Current Agent Tool Restrictions

### **Explorer Agent**
**Allowed Tools:** `Glob`, `Grep`, `Read`, `Bash`

**Purpose:** Broad exploration and discovery
- Find relevant files with Glob patterns
- Search for code patterns with Grep
- Read important files to understand implementations
- Run shell commands for system information

**Forbidden:** Write, Edit, TodoWrite

**Why:** Explorer's job is to gather information, not create deliverables or plans.

---

### **Planner Agent**
**Allowed Tools:** `Read`, `Glob`, `Grep`, `TodoWrite`

**Purpose:** Analyze context and create actionable plans
- Read files to understand conventions and context
- Use Glob to find additional relevant files if needed
- Use Grep to search for specific patterns
- Create TodoWrite checklist with specific, actionable tasks

**Forbidden:** Write, Edit, Bash

**Why:**
- Planner creates the PLAN, not the EXECUTION
- Write/Edit are Coder's job
- Bash is Explorer's job
- Can read to make informed plans (not just blind planning)

**Overlap with Explorer:** Yes, Planner can read files. This is intentional:
- Explorer does broad exploration
- Planner does targeted reading to understand specific things needed for planning
- This prepares for RAG where Planner will query knowledge base

---

### **Coder Agent**
**Allowed Tools:** `Write`, `Edit`, `Read`, `Glob`, `Grep`, `TodoWrite`

**Purpose:** Execute the plan by creating/modifying files
- Write new files with complete code
- Edit existing files with precise changes
- Read files for reference when writing code
- Use Glob to find where files should go or find examples
- Use Grep to search for patterns, imports, fixtures to match
- Update TodoWrite to mark completed tasks

**Forbidden:** Bash

**Why:**
- Coder's job is WRITING code, not EXECUTING it
- Needs to search (Glob/Grep) to find correct locations and patterns
- Can explore files but can't run commands
- Bash is for running tests/builds (that's verification, not coding)

---

## Validation Strategy

### **Enforcement Approach: Hybrid**

**1. Runtime Detection:**
- Track all tool calls
- Mark tools as "restricted" if not in allowed list
- Log warnings when restricted tools are used

**2. Post-Execution Validation:**
- Check if agent used any restricted tools
- If yes: FAIL validation
- If no: Check for required outputs

**3. Required Outputs:**
- Explorer: Must provide exploration summary with files found
- Planner: Must use TodoWrite at least once with 2+ tasks
- Coder: Must use Write or Edit at least once

### **Validation Logic:**

```javascript
// Step 1: Check tool restrictions
if (usedRestrictedTools()) {
  return FAIL("Used forbidden tools");
}

// Step 2: Check required output
if (!hasRequiredOutput()) {
  return FAIL("Missing required deliverable");
}

// Step 3: Pass
return PASS("Agent completed successfully");
```

---

## Rationale for Tool Choices

### **Why Planner Can Read**

**Original concern:** "Planner should only plan, not explore"

**Updated reasoning:**
1. **Context Understanding:** Can't make good plan without understanding code
2. **Convention Learning:** Needs to see how things are done
3. **RAG Preparation:** Future RAG will query knowledge base (similar to Read)
4. **Overlap is OK:** Explorer explores broadly, Planner reads specifically

**Example:**
- Explorer: "Found 50 test files"
- Planner: Reads ONE test file to see pattern, then plans
- Coder: Creates new test following that pattern

### **Why Planner Can Use Glob/Grep**

**Reasoning:**
- Sometimes Explorer doesn't find everything needed
- Planner might need to search for specific patterns
- Better to allow targeted exploration than force blind planning
- Still can't execute (Write/Edit forbidden)

**Example:**
- Explorer: Found WebSocket files
- Planner: Uses Grep to find specific test pattern
- Planner: Creates TodoWrite with informed steps
- Coder: Executes the plan

### **Why Coder CAN Use Glob/Grep (Updated in V2.1)**

**Original reasoning (too strict):**
- Coder already has context from Explorer and Planner
- Shouldn't need to search

**Updated reasoning (Option C):**
- Coder needs to find WHERE to put files (Glob for similar test locations)
- Coder needs to find HOW to structure code (Grep for imports, fixtures, patterns)
- Coder isn't "exploring broadly" like Explorer - it's "finding specifics for implementation"
- Still can't execute (Bash forbidden) - that's testing/verification

**Example:**
- Explorer: "Found test_ws_router.py, test_client.py"
- Planner: "Create test_websocket_advanced.py with 5 tests"
- Coder: Uses Glob to find "tests/test_*.py" to see naming pattern, uses Grep to find "from fastapi.testclient import TestClient" to get correct imports

---

## Overlaps and Interactions

### **Read Tool (Used by all 3 agents)**

**Explorer:**
- Reads files to understand implementations
- Reads many files during exploration
- Focus: "What exists?"

**Planner:**
- Reads files to learn conventions
- Reads selectively for planning
- Focus: "How should I plan this?"

**Coder:**
- Reads files for reference while coding
- Reads specific files needed for implementation
- Focus: "What do I need to match?"

**Overlap is OK:** Different purposes, no conflict

### **Glob/Grep (Used by Explorer and Planner)**

**Explorer:**
- Uses Glob to find all relevant files broadly
- Uses Grep to search for patterns across codebase
- Focus: Discovery

**Planner:**
- Uses Glob/Grep if needs additional context
- Should be rare (Explorer should have found most things)
- Focus: Filling gaps

**Minimal overlap:** Explorer is thorough, Planner is supplementary

---

## Benefits of V2 Boundaries

### **Compared to V1 (Too Strict):**
✅ Planner can now read files to make informed plans
✅ Planner can search for patterns if needed
✅ Better preparation for RAG integration
✅ More natural workflow
✅ Still maintains clear execution boundary (no Write/Edit)

### **Compared to No Boundaries:**
✅ Clear role separation (Planning vs Execution)
✅ Validation catches major violations (Planner writing files)
✅ Easier to debug when things go wrong
✅ Forces specialization

---

## Future: RAG Integration

When we add RAG (ChromaDB), tool boundaries will become:

### **Explorer Agent**
**Added:** RAG semantic search
- Can query indexed codebase
- Find similar code patterns
- Semantic understanding of relationships

### **Planner Agent**
**Added:** RAG knowledge base queries
- Query for best practices
- Find similar plans from history
- Access project conventions documentation

### **Coder Agent**
**Unchanged:** Still no exploration
- Relies on context from previous stages
- RAG would be redundant (already has what it needs)

---

## Summary Table

| Agent | Allowed Tools | Forbidden Tools | Primary Output |
|-------|---------------|-----------------|----------------|
| **Explorer** | Glob, Grep, Read, Bash | Write, Edit, TodoWrite | Exploration summary |
| **Planner** | Read, Glob, Grep, TodoWrite | Write, Edit, Bash | TodoWrite checklist |
| **Coder** | Write, Edit, Read, Glob, Grep, TodoWrite | Bash | Created/modified files |

---

## Testing Strategy

When testing agent boundaries:

1. **Watch for warnings:** `⚠️ [Agent] Used RESTRICTED tool:`
2. **Check validation:** Should FAIL if forbidden tool used
3. **Verify retries:** System should retry up to 3 times
4. **Test edge cases:**
   - Planner reading files (should PASS)
   - Planner writing files (should FAIL)
   - Coder using Glob (should FAIL)

---

## Known Limitations

1. **Planner might still try to use Write/Edit**
   - Model behavior issue, not architecture issue
   - Prompt needs to be very forceful
   - Validation catches it

2. **Some overlap between Explorer and Planner**
   - Both can Read/Glob/Grep
   - This is intentional and OK
   - Different purposes

3. **Tool restrictions don't prevent tool calls**
   - Tools execute, then validation fails
   - Could add pre-execution blocking (future)
   - Current approach is post-execution validation

---

## Version History

- **V1 (2025-10-29):** Initial strict boundaries, Planner TodoWrite only
- **V2 (2025-10-29):** Relaxed Planner restrictions, added Read/Glob/Grep
- **V2.1 (2025-10-29):** Relaxed Coder restrictions, added Glob/Grep (Option C) - Coder can search but not execute
