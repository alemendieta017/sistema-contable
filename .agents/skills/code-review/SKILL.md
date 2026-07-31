---
name: code-review
description: Perform a comprehensive code review on specific files, pull requests, or uncommitted git changes. Analyzes security, performance, architecture, code quality, and edge cases.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (e.g., specific file paths, git commits, or focus areas like security or performance).

## Goal

Provide an objective, high-signal, and actionable code review. Identify bugs, security risks, performance bottlenecks, architectural flaws, and code maintainability issues before code is merged or deployed.

## Operating Constraints

- **STRICTLY READ-ONLY BY DEFAULT**: Do **not** modify source files during the review unless the user explicitly requests automatic refactoring or fixes.
- **EMPIRICAL & SPECIFIC**: Always cite exact file paths, line numbers, variable names, and code snippets. Avoid vague or generic recommendations.
- **HIGH SIGNAL**: Prioritize impactful issues (correctness, security vulnerabilities, memory/performance leaks) over subjective nitpicks or style preferences.

## Review Pillars

Analyze the target code against the following 6 pillars:

### 1. Correctness & Business Logic
- Unhandled edge cases, null/undefined checks, boundary conditions.
- Asynchronous control flow bugs (unhandled promises, race conditions, missing `await`).
- Logic errors or broken domain rules.

### 2. Security (OWASP Top 10 focus)
- Injection vulnerabilities (SQLi, Command Injection, NoSQLi).
- Cross-Site Scripting (XSS) and unsafe HTML rendering.
- Missing input validation, sanitization, or schema enforcement.
- Hardcoded secrets, tokens, passwords, or sensitive API keys.
- Authentication & Authorization checks on sensitive routes or procedures.

### 3. Performance & Resource Efficiency
- N+1 query patterns or inefficient database operations.
- React/UI performance: unnecessary re-renders, missing `useMemo`/`useCallback`, large unpaginated lists.
- Memory leaks (uncleaned event listeners, unclosed DB connections, lingering subscriptions).
- Expensive operations in blocking main thread execution.

### 4. Architecture & Design Patterns
- Adherence to project architecture (separation of backend logic, frontend state, modularity).
- TypeScript typing rigor: proper interfaces/types, avoiding explicit or implicit `any`, unsafe type assertions (`as unknown as ...`).
- Single Responsibility Principle (SRP) and modularity.

### 5. Maintainability & Readability
- Code duplication (DRY violations) across components or backend services.
- Naming clarity for variables, functions, and components.
- Cyclomatic complexity (deeply nested conditionals, oversized functions).

### 6. Testing & Error Handling
- Error swallowing or silent try/catch blocks without logging/reporting.
- Missing error boundary coverage or user feedback on API failures.
- Adequate unit/integration test coverage for critical paths.

---

## Execution Steps

### 1. Target Scope Resolution
Determine what code needs review based on `$ARGUMENTS`:
- If specific file paths are provided, inspect those files.
- If `git` arguments or diff flags are supplied (e.g., `staged`, `branch`), check `git status` and `git diff`.
- If no argument is given, review the recent uncommitted changes (`git diff` / `git status`) or active files in the workspace.

### 2. Context Loading
- Read the target files completely using line ranges to avoid snippet tunnel vision.
- Inspect imported types, utilities, or shared schemas if relevant to verify contract compliance.

### 3. Multi-Pass Analysis
Perform a pass through each of the 6 Review Pillars. Record findings with severity classification:

- **CRITICAL**: Vulnerabilities (XSS, SQLi, secrets in code), data loss risks, severe logic failures that crash the app.
- **HIGH**: Performance bottlenecks, unhandled async errors, broken business rules, high regression risks.
- **MEDIUM**: Unsafe type casting, code duplication, missing error feedback, missing validation.
- **LOW / NIT**: Minor readability improvements, variable naming suggestions, small formatting/style recommendations.

---

## Report Structure

Format the code review output as follows:

# Code Review Report

## Summary
- **Files Reviewed**: List of target files
- **Overall Assessment**: (Approved / Requires Changes / Needs Critical Fixes)
- **Issue Count**: CRITICAL: X | HIGH: Y | MEDIUM: Z | LOW: W

---

## Key Findings

### [Severity] Title of Finding
- **File**: [filename](file:///absolute/path/to/file#L12-L34)
- **Pillar**: (Security / Performance / Correctness / Architecture / Maintainability / Testing)
- **Description**: Concise explanation of the issue and potential impact.
- **Current Code**:
  ```ts
  // snippet of issue
  ```
- **Recommended Fix**:
  ```ts
  // snippet of proposed solution
  ```

---

## Positives & Highlights
- Highlight well-structured code, good design patterns, or high test quality found in the review.

---

## Recommended Next Steps
1. High-priority action items to resolve.
2. Offer to automatically apply fixes if requested by the user.
