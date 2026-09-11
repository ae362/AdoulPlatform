import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface AuditFinding {
  pageUrl: string;
  type: 'CONSOLE_ERROR' | 'PAGE_CRASH' | 'NETWORK_FAILURE' | 'DEAD_BUTTON' | 'PLACEHOLDER_ACTION';
  elementText?: string;
  elementSelector?: string;
  details: string;
}

const findings: AuditFinding[] = [];
const visitedRoutes: { route: string; status: 'PASSED' | 'WARNING' | 'FAILED'; durationMs: number }[] = [];

function recordFinding(finding: AuditFinding) {
  findings.push(finding);
  const prefix = finding.elementText ? ' "' + finding.elementText + '" - ' : '';
  console.log('  [' + finding.type + '] ' + finding.pageUrl + ': ' + prefix + finding.details);
}

function attachPageListeners(page: Page, currentUrlRef: { url: string }) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico') && !text.includes('[vite]') && !text.includes('Download the React DevTools')) {
        recordFinding({
          pageUrl: currentUrlRef.url,
          type: 'CONSOLE_ERROR',
          details: text,
        });
      }
    }
  });

  page.on('pageerror', (err) => {
    recordFinding({
      pageUrl: currentUrlRef.url,
      type: 'PAGE_CRASH',
      details: err.message || String(err),
    });
  });

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 500) {
      recordFinding({
        pageUrl: currentUrlRef.url,
        type: 'NETWORK_FAILURE',
        details: 'HTTP ' + status + ' on ' + url,
      });
    }
  });

  page.on('dialog', async (dialog) => {
    const message = dialog.message();
    recordFinding({
      pageUrl: currentUrlRef.url,
      type: 'PLACEHOLDER_ACTION',
      details: 'Triggered browser alert dialog: "' + message + '"',
    });
    await dialog.dismiss();
  });
}

test.describe('Autonomous Platform Crawler & Quality Audit', () => {
  const currentUrlRef = { url: '/' };

  test.beforeEach(async ({ page }) => {
    attachPageListeners(page, currentUrlRef);
  });

  const PUBLIC_ROUTES = [
    { path: '/', name: 'Landing Page' },
    { path: '/login', name: 'Login Page' },
    { path: '/register', name: 'Register Page' },
    { path: '/public/copy-extraction', name: 'Citizen Copy Extraction' },
    { path: '/public/search-deeds', name: 'Citizen Deed Search' },
    { path: '/knowledge/professional-programs', name: 'Professional Programs' },
    { path: '/knowledge/audiovisual-library', name: 'Audiovisual Library' },
    { path: '/knowledge/digital-archive', name: 'Digital Archive' },
    { path: '/knowledge/meetings-dialogues', name: 'Meetings & Dialogues' },
    { path: '/news/smart-reminder', name: 'Smart Reminder' },
    { path: '/news/legal-news', name: 'Legal News' },
    { path: '/news/legislative-changes', name: 'Legislative Changes' },
    { path: '/directory', name: 'Notaries Directory' },
    { path: '/society-members', name: 'Society Members Portal' },
  ];

  for (const item of PUBLIC_ROUTES) {
    test('Crawl Public Route: ' + item.name + ' (' + item.path + ')', async ({ page }) => {
      currentUrlRef.url = item.path;
      const startTime = Date.now();
      const findingsBefore = findings.length;

      await page.goto(item.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);

      // Inspect elements efficiently inside page context
      const inspection = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a'));
        const deadElements: { text: string; href: string | null }[] = [];
        for (const el of elements) {
          if (el.closest('.leaflet-control') || el.classList.contains('leaflet-control')) {
            continue;
          }
          const tagName = el.tagName.toLowerCase();
          const href = el.getAttribute('href');
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
          if (tagName === 'a' && (href === '#' || href === 'javascript:void(0)')) {
            deadElements.push({ text: text.slice(0, 50), href });
          }
        }
        return { deadElements, totalCount: elements.length };
      });

      for (const dead of inspection.deadElements) {
        recordFinding({
          pageUrl: item.path,
          type: 'DEAD_BUTTON',
          elementText: dead.text,
          elementSelector: 'a[href="#"]',
          details: 'Anchor link has empty href="#" or "javascript:void(0)" with no valid URL.',
        });
      }

      const durationMs = Date.now() - startTime;
      const hadNewIssues = findings.length > findingsBefore;
      visitedRoutes.push({
        route: item.path,
        status: hadNewIssues ? 'WARNING' : 'PASSED',
        durationMs,
      });

      expect(page.url()).toContain(item.path);
    });
  }

  // ROLES SUITE: Separated per role so each has isolated state, its own timeout, and clear diagnostics
  const ROLES = [
    {
      role: 'notary',
      name: 'Adoul / Notary',
      email: process.env.TEST_NOTARY_EMAIL,
      password: process.env.TEST_NOTARY_PASSWORD,
      portalSubRoutes: ['/notary-portal', '/notary-notifications', '/fees', '/search', '/messages'],
    },
    {
      role: 'judge',
      name: 'Judge Portal',
      email: process.env.TEST_JUDGE_EMAIL,
      password: process.env.TEST_JUDGE_PASSWORD,
      portalSubRoutes: ['/judge'],
      portalSubRoutes: [
        '/judge',
        '/judge/notifications',
        '/judge/deeds',
        '/judge/office-movement',
        '/judge/marriage-permissions',
        '/judge/scientific-permissions',
        '/judge/adl-copy-permissions',
        '/judge/individual-reception',
        '/judge/work-certificates',
        '/judge/judicial-speech',
      ],
    },
    {
      role: 'citizen',
      name: 'Citizen / Beneficiary',
      email: process.env.TEST_CITIZEN_EMAIL,
      password: process.env.TEST_CITIZEN_PASSWORD,
      portalSubRoutes: ['/dashboard'],
    },
    {
      role: 'regional_council',
      name: 'Regional Adoul Council',
      email: process.env.TEST_REGIONAL_COUNCIL_EMAIL,
      password: process.env.TEST_REGIONAL_COUNCIL_PASSWORD,
      portalSubRoutes: ['/regional-council'],
    },
    {
      role: 'national_authority',
      name: 'National Notary Authority',
      email: process.env.TEST_NATIONAL_AUTHORITY_EMAIL,
      password: process.env.TEST_NATIONAL_AUTHORITY_PASSWORD,
      portalSubRoutes: ['/national-council'],
    },
  ];

  for (const roleDef of ROLES) {
    test('Audit Role: ' + roleDef.name, async ({ page }) => {
      test.skip(!roleDef.email || !roleDef.password, 'Credentials not provided in .env.test');

      console.log('[TEST] Authenticating as ' + roleDef.name + ' (' + roleDef.email + ')...');
      currentUrlRef.url = '/login';
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      await page.locator('#email').fill(roleDef.email!);
      await page.locator('#password').fill(roleDef.password!);
      await page.locator('button[type="submit"]').click();

      // Verify successful login
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
      console.log('  [SUCCESS] Logged in as ' + roleDef.name + ' -> ' + page.url());

      // Crawl the role portal pages
      for (const subRoute of roleDef.portalSubRoutes) {
        currentUrlRef.url = subRoute;
        const startTime = Date.now();
        const findingsBefore = findings.length;

        await page.goto(subRoute, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1200);

        // Safe in-page DOM audit (does not hold stale Playwright locators)
        const pageAudit = await page.evaluate(() => {
          const allButtons = Array.from(document.querySelectorAll('button:not([disabled])'));
          const deadButtons: string[] = [];
          
          for (const b of allButtons) {
            const txt = (b.textContent || b.getAttribute('aria-label') || '').trim();
            // Check for buttons with no text and no icons/aria
            if (!txt && !b.querySelector('svg, img, i')) {
              deadButtons.push(b.outerHTML.slice(0, 80));
            }
          }

          const brokenAnchors: string[] = [];
          const allAnchors = Array.from(document.querySelectorAll('a'));
          for (const a of allAnchors) {
            const href = a.getAttribute('href');
            if (href === '#' || href === 'javascript:void(0)') {
              brokenAnchors.push((a.textContent || '').trim().slice(0, 40));
            }
          }

          return {
            totalButtons: allButtons.length,
            deadButtons,
            brokenAnchors,
          };
        });

        for (const dead of pageAudit.deadButtons) {
          recordFinding({
            pageUrl: subRoute,
            type: 'DEAD_BUTTON',
            elementSelector: 'button',
            details: 'Button has no readable text, aria-label, or icon: ' + dead,
          });
        }

        for (const broken of pageAudit.brokenAnchors) {
          recordFinding({
            pageUrl: subRoute,
            type: 'DEAD_BUTTON',
            elementText: broken,
            elementSelector: 'a[href="#"]',
            details: 'Portal link has empty href="#" or "javascript:void(0)".',
          });
        }

        // Test safe navigation tabs (click only tabs or navigation buttons, avoid delete/submit)
        const tabs = await page.locator('[role="tab"], nav button:visible, [data-tab]:visible').all();
        for (const tab of tabs.slice(0, 8)) {
          try {
            await tab.click({ timeout: 1500 });
            await page.waitForTimeout(300);
          } catch {
            // Ignore if covered by modal or re-rendered
          }
        }

        // Specifically verify primary action buttons on notification centers
        if (subRoute.includes('notifications')) {
          const actionBtn = page.locator('button:has-text("فتح مسار"), button:has-text("معالجة الطلب")').first();
          if (await actionBtn.isVisible()) {
            const currentUrl = page.url();
            try {
              await actionBtn.click({ force: true, timeout: 3000 });
              await page.waitForTimeout(1000);
              const newUrl = page.url();
              if (newUrl === currentUrl) {
                recordFinding({
                  pageUrl: subRoute,
                  type: 'DEAD_BUTTON',
                  elementText: 'فتح مسار المعالجة المناسب',
                  elementSelector: 'button:has-text("فتح مسار")',
                  details: 'Action button was clicked but remained on the notifications page without navigating to the target portal.',
                });
              } else {
                console.log('  [PASS] Action button successfully routed from ' + currentUrl + ' to: ' + newUrl);
                await page.goto(subRoute, { waitUntil: 'domcontentloaded' });
              }
            } catch (err: any) {
              recordFinding({
                pageUrl: subRoute,
                type: 'DEAD_BUTTON',
                elementText: 'فتح مسار المعالجة المناسب',
                details: 'Action button click failed: ' + err.message,
              });
            }
          }
        }

        const durationMs = Date.now() - startTime;
        const hadNewIssues = findings.length > findingsBefore;
        visitedRoutes.push({
          route: subRoute + ' (' + roleDef.role + ')',
          status: hadNewIssues ? 'WARNING' : 'PASSED',
          durationMs,
        });
      }
    });
  }

  test.afterAll(async () => {
    const outDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const reportPath = path.join(outDir, 'CRAWLER_AUDIT_REPORT.md');
    let md = '# 🕷️ Autonomous E2E Platform Crawler & Quality Audit Report\n\n';
    md += '*Generated at: ' + new Date().toISOString() + '*\n\n';
    md += '## Summary\n';
    md += '- Total Pages Crawled: ' + visitedRoutes.length + '\n';
    md += '- Total Issues / Findings: ' + findings.length + '\n\n';
    md += '## 📋 Crawled Pages Status\n\n';
    md += '| Route | Status | Duration |\n| :--- | :--- | :--- |\n';
    for (const r of visitedRoutes) {
      const badge = r.status === 'PASSED' ? '✅ PASSED' : '⚠️ WARNING';
      md += '| `' + r.route + '` | ' + badge + ' | ' + r.durationMs + 'ms |\n';
    }
    md += '\n## 🔍 Detected Issues & Inconsistencies\n\n';
    if (findings.length === 0) {
      md += '🎉 **Zero issues found!** All crawled pages rendered without console errors, crashes, or broken links.\n';
    } else {
      md += '| Severity / Type | Location | Element / Details |\n| :--- | :--- | :--- |\n';
      for (const f of findings) {
        const elem = f.elementText ? '**\"' + f.elementText + '\"**<br/>' : '';
        md += '| `' + f.type + '` | `' + f.pageUrl + '` | ' + elem + f.details.replace(/\n/g, ' ') + ' |\n';
      }
    }
    fs.writeFileSync(reportPath, md, 'utf8');
    console.log('\n[REPORT] Audit report written to: ' + reportPath);
  });
});
