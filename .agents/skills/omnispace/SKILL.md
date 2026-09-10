---
name: omnispace
description: >-
  Multi-Space Contract Orchestration and Intelligent Model Routing for Antigravity.
  Maintains cross-layer synchronization across frontend, backend, shared schemas, and database migrations.
  Guides subagent delegation and model tier selection (flash vs pro) to maximize performance and minimize token cost.
metadata:
  framework: Antigravity-Agentic-Skill
---

# Omnispace: Multi-Space Contract Orchestration & Routing

Omnispace maintains spatial awareness across all decoupled layers of the platform (`frontend`, `backend`, `shared`, and `database`), ensuring that modifications in one layer never drift out of sync with another.

---

## 🎯 Core Capabilities

### 1. Cross-Boundary Contract Verification
Ensures that:
- Every tRPC procedure called in the frontend exists with matching input/output schemas in `backend/src/routers/`.
- Every shared Zod schema in `shared/schemas.ts` maps accurately to frontend form resolvers and database types.
- Database migrations in `backend/migrations/` stay aligned with runtime models.

### 2. Intelligent Model & Subagent Routing Matrix
When invoking subagents (`invoke_subagent`), select models according to task weight:

| Task Type | Recommended Subagent Model | Rationale |
|---|---|---|
| **Documentation / Grep / Syntax Lookups** | `flash` / `flash_lite` | High speed, near-zero cost, sufficient reasoning |
| **Component Layout / CSS / UI Tweaks** | `flash` | Rapid visual iteration |
| **Type Refactoring / Complex Logic** | `pro` / `inherit` | High semantic understanding, multi-file type resolution |
| **Security Auditing / Cryptographic Protocols** | `pro` | Deep reasoning, adversarial thinking |

---

## 🚀 Commands

```bash
# Run Omnispace cross-boundary audit
node .agents/skills/omnispace/scripts/omnispace.js
```

