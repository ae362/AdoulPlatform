---
name: ponytail
description: >-
  The "lazy but senior" developer engineering discipline. Enforces the Necessity Ladder
  to cut code generation, prevent over-engineering, eliminate unnecessary dependencies,
  and prioritize standard library, native platform, and one-liners before writing custom code.
  Use when refactoring, writing new features, or optimizing agent token usage and code footprint.
metadata:
  author: DietrichGebert/ponytail
  framework: Antigravity-Agentic-Skill
---

# Ponytail: Senior Engineering Minimalism & YAGNI Discipline

> *"The best code is the code you never wrote. The second best is the code that deleted fifty other lines."*

Ponytail equips Antigravity with the mindset of a battle-tested Principal Engineer who resists complexity, rejects unnecessary abstractions, and writes the absolute minimum amount of code necessary to solve a problem with 100% correctness.

---

## 🪜 The Necessity Ladder (Evaluate Before Every Edit)

Before adding a function, class, package, or block of code, evaluate the problem against the **6 Rungs of the Ladder** in strict descending order:

```
[1. YAGNI] ───────────► Does this truly need to exist? (If not, DELETE or SKIP)
      │
[2. Stdlib] ──────────► Can JavaScript/TypeScript/Node.js standard library do this?
      │
[3. Native Platform] ─► Does the browser (HTML5/CSS3/DOM API) or OS do this natively?
      │
[4. Existing Libs] ───► Can an already installed dependency handle this?
      │
[5. One-Liner] ───────► Can it be written cleanly in 1 to 3 lines?
      │
[6. Minimal Code] ────► Write the tightest, strictly typed implementation possible.
```

---

## 🚫 The Anti-Patterns Ponytail Eliminates

| Bloat / Fragile Pattern | Ponytail Senior Alternative |
|---|---|
| Creating custom utility functions for simple array operations | Use native `Array.prototype` methods (`map`, `filter`, `find`, `some`, `reduce`) |
| Installing a new npm package for date/format/uuid tasks | Use native `crypto.randomUUID()`, `Intl.DateTimeFormat`, or `new Date()` |
| Wrapping simple state in complex custom Redux/stores | Use standard React `useState` or local component state |
| Writing 100 lines of speculative "future-proof" abstraction layers | Solve only the exact current requirement (YAGNI) |
| Duplicating CSS classes and building complex styled wrappers | Use semantic Tailwind utility classes already in the codebase |
| Rewriting adjacent functions during a bugfix | Surgical, atomic diffs targeting ONLY the bugged line |

---

## 🛡️ Non-Negotiable Safety Invariants

Being "lazy" never means being careless. The following standards must **never** be compromised:

1. **Strict Type Safety**: Never use `any` to avoid thinking about types.
2. **Security & Validation**: Never skip input sanitization, authentication, or Zod schemas.
3. **Data Loss Prevention**: Always handle errors, null checks, and fallbacks.
4. **Encoding & RTL**: Never mutate or corrupt Arabic legal text, RTL layout, or UTF-8 strings.
5. **Zero Regression**: Existing buttons, endpoints, and workflows must remain 100% operational.

---

## ⚡ Execution Modes

### Mode 1: `ponytail-lite`
Applies to routine bugfixes and minor tweaks. Focuses on minimal diff size and zero side regressions.

### Mode 2: `ponytail-full` (Default)
Enforces the full 6-rung ladder on every new feature or refactor. Replaces multi-line custom code with native stdlib / existing packages.

### Mode 3: `ponytail-ultra`
Aggressive code deletion mode. Analyzes a module for dead code, redundant wrappers, and duplicated functions, consolidating them into standard library primitives.

