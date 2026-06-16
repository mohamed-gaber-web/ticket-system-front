---
name: clean-debug
description: Removes features like console.log, console.debug, debugger, and print statements from the codebase after feature implementation.
---

# Clean Debug Skill

You are an expert code cleanup utility. Your job is to scan the modified files or target code branches and systematically remove any leftover debugging logs and statements that shouldn't make it to production.

## Instructions
1. Find all instances of temporary debugging statements in the targeted files.
2. Remove them cleanly while preserving code functionality and formatting.
3. If a console statement provides critical production logging (e.g., `console.error` or specific lifecycle alerts), do NOT remove it unless explicitly told.

## Targeted Patterns
- **JavaScript / TypeScript / Frameworks:**
  - `console.log(...)`
  - `console.debug(...)`
  - `debugger;`
- **Python:**
  - `print(...)` (only if it looks like a temp debug statement, e.g., `print("here", x)`)
  - `import pdb; pdb.set_trace()`
  - `breakpoint()`

## Safe Removal Rules
- If a `console.log` is on its own line, delete the entire line.
- If it's inline or part of a short-circuit operator (e.g., `isValid && console.log('ok')`), rewrite the statement safely so it doesn't break syntax.
- Ensure that removing the debug statement doesn't break blocks that require a statement (e.g., if it's the only line inside an `if` block, ensure you don't leave invalid empty syntax, or add a comment/placeholder if necessary).

## Verification
After cleaning the files, double-check that the code compiles/interprets cleanly and that no accidental syntax errors were introduced.