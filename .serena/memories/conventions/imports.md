# Import Convention

- `~/` — all app code (`~/lib/*`, `~/server/*`, `~/components/ApplicationForm`, etc.)
- `@/` — shadcn/ui components only (`@/components/ui/*`)
- No relative imports (`../`) — always use `~/` alias
- Both `~/` and `@/` resolve to `./src/*` via tsconfig paths
