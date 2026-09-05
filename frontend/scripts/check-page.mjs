import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5174/national-council/authority-finances';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('pageerror', (err) => {
  console.error('[pageerror]', err?.message || String(err));
});
page.on('console', (msg) => {
  const type = msg.type();
  if (['error', 'warning'].includes(type)) {
    console.error(`[console.${type}]`, msg.text());
  }
});

const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
console.log('status', resp?.status());

// Give the app some time to hydrate and possibly throw.
await page.waitForTimeout(2500);

// Dump visible body text to help detect blank/overlay.
const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
console.log('bodyTextPreview', JSON.stringify(bodyText));

await browser.close();
