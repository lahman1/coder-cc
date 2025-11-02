# LC-Coder vs Claude Code Test Scenarios

## Test Categories

### 1. Code Understanding Tasks
Test the ability to understand existing code.

#### Python (FastAPI)
- "Explain how dependency injection works in FastAPI"
- "Find all endpoints that use authentication"
- "What database models are defined in this project?"

#### Java (Commons Lang)
- "Find all deprecated methods in StringUtils"
- "Explain how the builder pattern is used in this project"
- "What's the purpose of the Validate class?"

#### C++ (nlohmann/json)
- "How does the JSON parser handle nested objects?"
- "Find all operator overloads in the json class"
- "Explain the iterator implementation"

### 2. Bug Finding Tasks
Test ability to identify issues.

#### Python (FastAPI)
- "Find potential SQL injection vulnerabilities"
- "Check for missing error handling in routes"
- "Identify any circular imports"

#### Java (Commons Lang)
- "Find methods that might throw NullPointerException"
- "Check for resource leaks"
- "Identify thread safety issues"

#### C++ (nlohmann/json)
- "Find potential memory leaks"
- "Check for undefined behavior"
- "Identify missing bounds checks"

### 3. Code Modification Tasks
Test ability to make changes.

#### Python (FastAPI)
- "Add logging to all API endpoints"
- "Create a new endpoint for user profiles"
- "Add input validation to existing endpoints"

#### Java (Commons Lang)
- "Add a new utility method to StringUtils for URL encoding"
- "Improve the performance of the contains method"
- "Add null safety annotations"

#### C++ (nlohmann/json)
- "Add a new method to pretty-print JSON with custom indentation"
- "Implement a size() method for JSON objects"
- "Add move semantics to improve performance"

### 4. Test Writing Tasks
Test ability to create tests.

#### Python (FastAPI)
- "Write unit tests for the user authentication endpoint"
- "Create integration tests for database operations"
- "Add test coverage for error handling"

#### Java (Commons Lang)
- "Write comprehensive tests for StringUtils.split()"
- "Create parameterized tests for the Range class"
- "Add edge case tests for date utilities"

#### C++ (nlohmann/json)
- "Write tests for JSON serialization edge cases"
- "Create performance benchmarks"
- "Add fuzz tests for the parser"

### 5. Documentation Tasks
Test ability to document code.

#### Python (FastAPI)
- "Add comprehensive docstrings to all route handlers"
- "Create API documentation for new endpoints"
- "Document the authentication flow"

#### Java (Commons Lang)
- "Update JavaDoc for deprecated methods"
- "Add code examples to utility methods"
- "Document thread safety guarantees"

#### C++ (nlohmann/json)
- "Add Doxygen comments to template functions"
- "Create usage examples for beginners"
- "Document the exception hierarchy"

### 6. Refactoring Tasks
Test ability to improve code structure.

#### Python (FastAPI)
- "Extract common validation logic into reusable functions"
- "Refactor database queries to use async/await properly"
- "Split large route files into smaller modules"

#### Java (Commons Lang)
- "Refactor StringUtils to use Java 8 features"
- "Extract common patterns into abstract base classes"
- "Reduce code duplication in test classes"

#### C++ (nlohmann/json)
- "Refactor parser to use modern C++20 features"
- "Extract magic numbers into named constants"
- "Simplify template metaprogramming"

## Comparison Metrics

### Quantitative Metrics
1. **Task Completion Rate** - Did it complete the task or just explain?
2. **Tool Usage Count** - How many tools were used?
3. **Retry Count** - How many retries were needed?
4. **Time to Complete** - How long did it take?
5. **Output Length** - How much was generated?
6. **Error Rate** - How many errors occurred?

### Qualitative Metrics
1. **Code Quality** - Is the generated code production-ready?
2. **Correctness** - Does the solution work?
3. **Completeness** - Are all edge cases handled?
4. **Style Consistency** - Does it match project conventions?
5. **Understanding Depth** - How well did it understand the codebase?
6. **Error Recovery** - How well did it handle failures?

## Testing Protocol

1. Run the same prompt on:
   - LC-Coder with enhanced mode
   - LC-Coder with basic mode
   - Claude Code

2. Capture for each:
   - Full conversation transcript
   - Tool usage log
   - Final output/files
   - Time taken
   - Any errors

3. Compare results using metrics above

4. Identify gaps and improvement opportunities