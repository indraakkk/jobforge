---
name: full-build
description: Orchestrated full-build workflow. Runs audit → reason → implement → review pipeline for a complete feature build with quality gates at each step.
---

# Full Build — Orchestrated Feature Workflow

End-to-end feature implementation with quality gates. Runs the complete pipeline:

1. **Audit** (karpathy-agent) — Review the approach for over-engineering
2. **Reason** (fprompt) — Structured analysis of key decisions
3. **Implement** — Write the code (with frontend-design-agent if UI involved)
4. **Review** (code-reviewer) — Independent quality check

## When to Use
- Building a complete feature (3+ files)
- Want quality gates without manually invoking each agent
- New module or significant addition

## Usage
```
/full-build Add the application tracker CRUD with list page, detail page, and create form
/full-build Implement Q&A vault search with PostgreSQL full-text search
/full-build Build CV upload and version management with MinIO
```

## Workflow

### Step 1: Audit
Invoke the karpathy-agent to review the feature plan:
- Is the scope appropriate?
- Any unnecessary complexity?
- Clear success criteria?

If verdict is RETHINK, stop and report to user.

### Step 2: Reason (if complex decisions exist)
Invoke fprompt for any architectural decisions surfaced in the audit:
- Which patterns to use
- Data model decisions
- Tradeoff analysis

### Step 3: Implement
Write the code following:
- CLAUDE.md conventions
- Relevant rules (effect-ts, database, testing)
- Patterns established in the codebase
- If UI is involved, apply frontend-design skill guidelines

### Step 4: Review
Invoke code-reviewer for post-implementation review:
- Effect TS patterns
- SQL safety
- Architecture boundaries
- CLAUDE.md compliance

Report final results with all agent outputs summarized.
