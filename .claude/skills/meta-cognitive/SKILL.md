---
name: meta-cognitive
description: Structured meta-cognitive reasoning for complex decisions. Use when facing ambiguous problems, architectural tradeoffs, or multi-option decisions that need confidence-scored analysis.
context: fork
agent: fprompt
---

# Meta-Cognitive Reasoning

Apply structured reasoning to complex problems using the DECOMPOSE → SOLVE → VERIFY → SYNTHESIZE → REFLECT protocol.

## When to Use
- Facing an ambiguous architectural decision
- Multiple valid approaches with unclear tradeoffs
- Need confidence scoring on a recommendation
- Complex problem that benefits from systematic decomposition

## Usage
```
/meta-cognitive Should we use Effect Schema or Zod for API validation at the server function boundary?
/meta-cognitive What's the best approach for implementing full-text search with PostgreSQL for Q&A entries?
/meta-cognitive How should we structure the CV version management — immutable snapshots or diff-based?
```

The agent will:
1. Decompose the problem into sub-problems
2. Solve each with reasoning and alternatives
3. Cross-verify for consistency
4. Synthesize into a coherent recommendation
5. Reflect with confidence score and conditions that would change the answer
