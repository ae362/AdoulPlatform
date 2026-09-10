---
name: graphify
description: >-
  Codebase Knowledge Graph Engine for Antigravity. Transforms the multi-package repository
  into a queryable structural graph of files, modules, AST exports, and dependency relationships.
  Use to inspect the blast radius of changes, find callers and consumers of functions/components,
  and navigate architecture without burning tokens or guessing file paths.
metadata:
  author: Graphify-Labs/graphify
  framework: Antigravity-Agentic-Skill
---

# Graphify: Codebase Knowledge Graph Engine

Graphify provides a structural knowledge graph of the entire repository. Instead of grepping blindly or reading dozens of files into context, Graphify lets you query cross-module relationships, determine blast radius before refactoring, and map dependencies instantly.

---

## 🚀 Quick Commands

Execute the built-in Graphify CLI via `run_command`:

```bash
# 1. Rebuild / Refresh the Knowledge Graph
node .agents/skills/graphify/scripts/graphify.js index

# 2. Query any Symbol, File, or Component (Inward blast radius, Outward dependencies, Exports)
node .agents/skills/graphify/scripts/graphify.js query <symbol_or_path>

# 3. View Architectural Summary & Top Module Hubs
node .agents/skills/graphify/scripts/graphify.js stats
```

---

## 💡 Practical Agent Workflows

### Workflow 1: Pre-Refactoring Blast Radius Analysis
Before modifying a core module (such as `AuthContext.tsx`, `trpc.ts`, or `feesAgentUtils.ts`):
1. Run `node .agents/skills/graphify/scripts/graphify.js query <module>`
2. Inspect the **Inward Blast Radius** list to identify every component that imports and uses the module.
3. Ensure no exported types or signatures break external callers.

### Workflow 2: Architectural Discovery
When researching how a feature flows across the stack:
1. Query the feature name or router (e.g. `marriageRecords`, `deedSealing`).
2. Graphify reveals the exact import tree from `backend/src/routers` to `frontend/src/modules` and `shared/schemas.ts`.

