# JobForge — Agent & Skill Inventory

## Agents

| Agent | File | Model | Role | Tools |
|-------|------|-------|------|-------|
| karpathy-agent | `.claude/agents/karpathy-agent.md` | sonnet | Code quality guardian, anti-over-engineering | Read, Grep, Glob, Bash |
| fprompt | `.claude/agents/fprompt.md` | sonnet | Meta-cognitive reasoning, structured analysis | Read, Grep, Glob, Bash |
| frontend-design-agent | `.claude/agents/frontend-design-agent.md` | sonnet | UI aesthetics, anti-slop design | Read, Grep, Glob, Bash, Edit, Write |
| code-reviewer | `.claude/agents/code-reviewer.md` | sonnet | Post-implementation review (read-only) | Read, Grep, Glob, Bash |
| effect-validator | `.claude/agents/effect-validator.md` | sonnet | Effect TS pattern validation (read-only) | Read, Grep, Glob, Bash |
| task-coordinator | `.claude/agents/task-coordinator.md` | opus | Parallel task orchestration via worktrees | All + Task |

## Skills → Agent Mapping

| Skill (`/command`) | Agent | How |
|--------------------|-------|-----|
| `/karpathy-guidelines` | karpathy-agent | `context: fork` → spawns isolated agent |
| `/frontend-design` | frontend-design-agent | `context: fork` → spawns isolated agent |
| `/meta-cognitive` | fprompt | `context: fork` → spawns isolated agent |
| `/audit-plan` | karpathy-agent | `context: fork` → spawns isolated agent |
| `/full-build` | orchestrated (multiple) | Sequential: audit → reason → implement → review |

## Rules (auto-activated by file path)

| Rule | File | Activates On |
|------|------|-------------|
| Effect TS | `.claude/rules/effect-ts.md` | `src/**/*.ts`, `src/**/*.tsx` (excluding routes) |
| Database | `.claude/rules/database.md` | `db/**/*`, `src/**/repo*` |
| Testing | `.claude/rules/testing.md` | `**/*.test.ts`, `**/*.spec.ts` |

## Workflow Patterns

### Standard Development
```
1. Plan (plan mode) → read phase doc
2. /audit-plan → validate approach
3. Implement in main conversation
4. "use code-reviewer to review" → quality check
5. "use effect-validator to check" → pattern check
```

### UI Development
```
1. /frontend-design [describe what to build]
2. Implement the design agent's output
3. "use code-reviewer to review"
```

### Complex Feature (3+ files)
```
1. /audit-plan → validate approach
2. "use task-coordinator to implement [feature]"
3. Coordinator decomposes + runs parallel workers
4. "use code-reviewer to review"
```

### Exploration / Research
```
"Use a subagent to research [topic]"
→ Claude uses built-in Explore agent (haiku, fast, cheap)
→ Returns summary to main conversation
```
