---
trigger: always_on
description: Guardrails for refactoring large files (10k+ lines), RTL/Arabic UTF-8 preservation, and compilation checks.
---

# Large-File & RTL/Arabic Refactoring Guardrails

When modifying, decomposing, or extracting code from large files (e.g., `FeesAgent.tsx` and files exceeding 5,000 lines):

1. **Immediate Compilation Verification (`tsc --noEmit`)**:
   - Execute a TypeScript check (`node frontend/node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json`) after every single extraction or file edit.
   - Do not batch multiple extraction steps or prompts without verifying that imports, exports, and types resolve cleanly with zero new errors.

2. **Strict RTL & UTF-8 Character Preservation**:
   - All tools and file operations must preserve UTF-8 encoding without BOM mangling.
   - Never alter, normalize, or corrupt hardcoded Arabic text, diacritics, or legal phrases (e.g., "إعادة ضبط", "بيع_وشراء", "رسم_تسليم_بعوض").

3. **Do Not Touch Component State Early**:
   - When modularizing large components, leave component state intact (`useState`, `useReducer`, TRPC/React Query hooks, refs, and context consumers) until static constants, lookup tables, type definitions, templates, and pure utility functions have been fully and safely extracted.

4. **Strict Scope & Zero Regression**:
   - Do not alter existing dictionary keys, string values, or component logic unless specifically requested.
   - Re-export extracted types and constants where needed to ensure external consumers remain unaffected.

