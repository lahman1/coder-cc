# LC-Coder vs Claude Code Testing Guide

## Setup for Testing

### Terminal 1: LC-Coder
```bash
cd /opt/agent/coder-cc
npm start | tee testing/lc-coder-output.log
```

### Terminal 2: Claude Code
Open Claude Code and save the conversation

### Terminal 3: This Terminal
For monitoring and analysis

## Test Scenarios to Run

### 🧪 Test 1: Code Understanding (Python/FastAPI)

**Prompt to use in both:**
```
Navigate to /opt/repos/fastapi and find all API endpoints. List them with their HTTP methods, paths, and what they do.
```

**What to observe:**
- Does it find the files?
- How many tools does it use?
- Is the output complete?
- How long does it take?

### 🧪 Test 2: Bug Finding (Java/Commons Lang)

**Prompt to use in both:**
```
In /opt/repos/commons-lang, analyze the StringUtils class and identify any methods that could throw NullPointerException. Suggest fixes.
```

**What to observe:**
- Does it identify the actual issues?
- Are the suggestions practical?
- Does it read the right files?

### 🧪 Test 3: Code Writing (C++/JSON)

**Prompt to use in both:**
```
In /opt/repos/json, add a new method to the JSON class called countKeys() that recursively counts all keys in a JSON object. Include nested objects.
```

**What to observe:**
- Does it create working code?
- Is the code style consistent?
- Does it handle edge cases?
- Does it compile?

### 🧪 Test 4: Test Generation (Python/FastAPI)

**Prompt to use in both:**
```
In /opt/repos/fastapi, write comprehensive unit tests for any one endpoint you find, including edge cases and error scenarios.
```

**What to observe:**
- Test coverage quality
- Edge cases considered
- Mocking approach
- Test organization

### 🧪 Test 5: Refactoring (Java/Commons Lang)

**Prompt to use in both:**
```
In /opt/repos/commons-lang, find duplicate code in StringUtils and refactor it to reduce duplication while maintaining functionality.
```

**What to observe:**
- Identification accuracy
- Refactoring approach
- Code maintainability
- Tests still pass?

## How to Compare Results

### 1. Capture Outputs

**LC-Coder:**
```bash
# The output is already being saved to testing/lc-coder-output.log
# Also capture enhanced mode separately:
echo "/enhanced" | npm start | tee testing/lc-enhanced.log
```

**Claude Code:**
- Copy the entire conversation
- Save to `testing/claude-code-output.txt`

### 2. Run Automated Comparison

```bash
# For a specific test
node testing/run-comparison-test.js python_understanding

# For all tests
node testing/run-comparison-test.js all
```

### 3. Manual Analysis Checklist

For each test, compare:

#### ✅ Task Completion
- [ ] LC-Coder completed the task?
- [ ] Claude Code completed the task?
- [ ] Which was more thorough?

#### 🔧 Tool Usage
- [ ] LC-Coder tools used: _____
- [ ] Claude Code tools used: _____
- [ ] Which was more efficient?

#### ⏱️ Performance
- [ ] LC-Coder time: _____
- [ ] Claude Code time: _____
- [ ] Which was faster?

#### 📝 Output Quality
- [ ] LC-Coder output useful?
- [ ] Claude Code output useful?
- [ ] Which was clearer?

#### ❌ Errors
- [ ] LC-Coder errors: _____
- [ ] Claude Code errors: _____
- [ ] Which handled errors better?

#### 🔄 Retries
- [ ] LC-Coder needed retries?
- [ ] Claude Code needed retries?
- [ ] Which recovered better?

## Key Differences to Note

### Expected LC-Coder Strengths
- ✅ Completely local and private
- ✅ No rate limits
- ✅ Free to use
- ✅ Can access local files directly
- ✅ Enhanced mode helps task completion

### Expected Claude Code Strengths
- ✅ Better understanding of complex requests
- ✅ More sophisticated code generation
- ✅ Better context retention
- ✅ Fewer retries needed
- ✅ More concise explanations

### Areas Where LC-Coder Needs Improvement
Based on your observations, note:

1. **Understanding Gaps:**
   - Misunderstood requests?
   - Missed context?
   - Wrong assumptions?

2. **Tool Usage Issues:**
   - Used wrong tool?
   - Too many tool calls?
   - Failed to use tools?

3. **Code Quality Issues:**
   - Incomplete code?
   - Style inconsistencies?
   - Missing error handling?

4. **Recovery Problems:**
   - Failed to retry?
   - Gave up too easily?
   - Couldn't find alternatives?

## Improvement Tracking

After identifying gaps, we can:

1. **Quick Fixes** (< 1 hour)
   - Adjust prompts
   - Add templates
   - Tweak retry logic

2. **Medium Improvements** (< 1 day)
   - Add context awareness
   - Improve tool selection
   - Enhance error patterns

3. **Major Enhancements** (> 1 day)
   - Implement learning
   - Add multi-file operations
   - Build pattern database

## Testing Commands Summary

```bash
# Start LC-Coder with enhanced mode
cd /opt/agent/coder-cc
npm start

# In LC-Coder, enable enhanced mode
/enhanced

# Run a specific scenario test
node testing/run-comparison-test.js python_understanding

# Check test outputs
ls -la testing/outputs/

# View comparison results
cat testing/outputs/*/comparison_*.json | jq '.'

# Tail the log file
tail -f testing/lc-coder-output.log
```

## Next Steps

1. Run tests 1-5 on both systems
2. Fill out the comparison checklist
3. Save all outputs to `testing/` directory
4. Run automated analysis
5. Identify top 3 improvements needed
6. We'll implement those improvements

Ready to start testing? Run Test 1 on both LC-Coder and Claude Code, then share the outputs!