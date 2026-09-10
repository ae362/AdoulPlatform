# Ponytail: Senior Engineering Minimalism & YAGNI Rule

When writing, refactoring, or modifying code in this project:

1. **The Necessity Ladder (Check Before Writing Any Code)**:
   - **Rung 1 (YAGNI)**: Never write speculative code, speculative helper functions, or future-proofing wrappers. Solve only the exact requirement.
   - **Rung 2 (Stdlib)**: Use native TypeScript / JavaScript / Node.js standard libraries first (`crypto.randomUUID()`, `Intl`, `URL`, array built-ins) instead of writing custom utilities.
   - **Rung 3 (Native Platform)**: Leverage native HTML5/CSS3/Tailwind capabilities before building custom component abstractions.
   - **Rung 4 (Existing Dependencies)**: Always reuse libraries already in `package.json` (`zod`, `pino`, `fastify`, `@tanstack/react-query`, `lucide-react`). Never add a new dependency if an existing one can do the job.
   - **Rung 5 (One-Liner / Conciseness)**: If an operation can be cleanly expressed in 1 to 3 lines, do not create a separate function or file for it.
   - **Rung 6 (Minimal Diff Footprint)**: Keep all edits surgical and atomic. Never rewrite untouched lines, comments, or adjacent logic.

2. **Strict Invariants**:
   - Zero regression to existing business logic or Moroccan notary workflows.
   - Strict preservation of RTL layout and Arabic legal phrasing.
   - 100% type-clean (`tsc --noEmit` must pass with 0 errors).

