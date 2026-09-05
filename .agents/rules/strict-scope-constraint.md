---
trigger: always_on
description: Enforce strict task scoping to only edit the exact files in scope, ensuring production-ready, bug-free, and well-optimized code.
---

# Strict Task Scoping & Production-Ready Code Standards

1. **Strict File Scope (حصر نطاق الملفات)**:
   - Modify **ONLY** the exact file(s) or module(s) strictly within the scope of the assigned task.
   - Do **NOT** touch, refactor, or edit adjacent or unrelated files unless the user explicitly requests it.
   - Keep all logic, state, and handling self-contained within the targeted module whenever feasible.

2. **Production-Ready & Bug-Free Quality (جودة إنتاجية خالية من الأخطاء)**:
   - Ensure the code is thoroughly verified, syntax-clean, and strictly typed (zero TypeScript/JSX compilation errors).
   - Prevent side regressions: ensure changes do not break existing features, buttons, or workflows.
   - Handle edge cases, nullability, and loading/error states gracefully.

3. **Optimization & Performance (التحسين والكفاءة)**:
   - Keep code well-optimized: avoid redundant network round-trips, duplicate renders, or expensive operations inside render cycles.
   - Maintain clean, readable, and maintainable architecture following the codebase's conventions.
