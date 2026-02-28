---
name: audit-plan
description: Audit an implementation plan for over-engineering, unnecessary complexity, and missed simplifications before execution. Based on Karpathy's coding guidelines.
context: fork
agent: karpathy-agent
---

# Audit Plan

Review an implementation plan through Karpathy's lens before writing any code. Catches over-engineering early when it's cheap to fix.

## When to Use
- Before implementing a feature — paste your plan
- After Claude generates a plan in plan mode — audit it
- When a plan feels too complex for the task

## Usage
```
/audit-plan
Here's my plan for the application tracker:
1. Create ApplicationService with CRUD
2. Add ApplicationRepository with SQL queries
3. Create ApplicationError tagged union
4. Build routes with TanStack Router
5. Add form validation with Effect Schema
```

The agent will review for:
- Unnecessary abstractions
- Premature generalization
- Missing success criteria
- Scope creep beyond what was asked
- Simpler alternatives that achieve the same goal

## Output
A structured review with APPROVE / REVISE / RETHINK verdict.
