---
trigger: always_on
description: Mandate professional production-ready engineering with zero-friction automation, self-contained architectures, and instant out-of-the-box user experiences.
---

# Zero-Friction Production Mindset & Automated Architecture (عقلية الإنتاج الاحترافي والأتمتة الذاتية)

When architecting, implementing, or troubleshooting features, tools, and background services across the platform:

1. **Zero Manual Setup for Users (حلول مؤتمتة بالكامل بدون متطلبات يدوية)**:
   - Never ask or expect platform users (notaries, judges, clerks) or administrators to manually download, install, or configure external software or server binaries.
   - All features must work **turn-key out-of-the-box**.

2. **Self-Contained & Automated Service Lifecycle (تشغيل ذاتي ومستقل)**:
   - If a background service or dependency is required (e.g., document servers, conversion bridges, OCR workers), automate its detection, startup, and recovery entirely within the application/Node.js server lifecycle.
   - Provide native in-engine / in-browser alternatives (e.g., client-side A4 editor, pure JS DOCX/PDF generators) so the user workflow is 100% functional without external dependencies.

3. **Enterprise Production Standards (معايير الأنظمة الإنتاجية)**:
   - Always approach architecture from the perspective of an enterprise-grade SaaS production environment.
   - When external servers are unavailable, degrade gracefully and silently to built-in native tools with zero UI crashes, zero hanging states, and zero console errors.
