/**
 * Enterprise Static Frontend Action Auditor
 * Scans frontend/src TSX and JSX files for:
 * 1. Empty / no-op onClick handlers (e.g. onClick={() => {}})
 * 2. Dead anchors / links (href="#" or to="#")
 * 3. Empty buttons without text, aria-label, or icon child
 * 4. Nested interactive controls (<button> inside <button>)
 * 5. Dangerous hook patterns (inline array/object defaults in useQuery fed to useEffect dependencies)
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_SRC = path.resolve(__dirname, '../frontend/src');

const findings = [];

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (/\.(tsx|jsx)$/i.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check 1: Empty onClick handlers
  const emptyClickRegex = /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}|onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*(?:undefined|null|void\s*0)\s*\}/g;
  lines.forEach((line, idx) => {
    let match;
    while ((match = emptyClickRegex.exec(line)) !== null) {
      findings.push({
        file: relPath,
        line: idx + 1,
        type: 'EMPTY_ONCLICK',
        snippet: line.trim().slice(0, 100),
        recommendation: 'Replace no-op empty handler with actual logic or disable the button if not yet implemented.',
      });
    }
  });

  // Check 2: Dead links (href="#" or to="#")
  const deadLinkRegex = /(?:href|to)\s*=\s*["'](?:#|javascript:void\(0\))["']/g;
  lines.forEach((line, idx) => {
    let match;
    while ((match = deadLinkRegex.exec(line)) !== null) {
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;
      findings.push({
        file: relPath,
        line: idx + 1,
        type: 'DEAD_LINK',
        snippet: line.trim().slice(0, 100),
        recommendation: 'Provide a valid route target or replace anchor with a semantic button.',
      });
    }
  });

  // Check 3: Nested <button> elements within same JSX block
  let insideButton = false;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/<button\b[^>]*>/i.test(trimmed)) {
      if (insideButton && !trimmed.includes('</button>')) {
        findings.push({
          file: relPath,
          line: idx + 1,
          type: 'NESTED_BUTTON',
          snippet: line.trim().slice(0, 100),
          recommendation: 'HTML5 forbids <button> inside <button>. Change outer container to <div role="button">.',
        });
      }
      if (!trimmed.includes('</button>')) {
        insideButton = true;
      }
    }
    if (/<\/button>/i.test(trimmed)) {
      insideButton = false;
    }
  });

  // Check 4: Unstable array/object defaults in useQuery passed to useEffect dependencies
  const queryDestructureRegex = /const\s*\{\s*data\s*:\s*([a-zA-Z0-9_]+)\s*=\s*(\[\]|\{\})\s*\}\s*=\s*(?:trpc\.|useQuery)/g;
  let qMatch;
  while ((qMatch = queryDestructureRegex.exec(content)) !== null) {
    const varName = qMatch[1];
    const effectDepRegex = new RegExp(`useEffect\\s*\\([^,]+,\\s*\\[[^\\]]*\\b${varName}\\b[^\\]]*\\]\\)`, 's');
    if (effectDepRegex.test(content)) {
      findings.push({
        file: relPath,
        line: 1,
        type: 'UNSTABLE_HOOK_DEP',
        snippet: qMatch[0],
        recommendation: `Variable "${varName}" has an inline default literal (${qMatch[2]}) and is listed in useEffect dependencies, causing an infinite re-render loop. Use stable module-level constant fallback or guard useEffect.`,
      });
    }
  }

  // Check 5: Empty <button> tags with no content/icon/label
  const emptyButtonTagRegex = /<button\b([^>]*)>(\s*)<\/button>/g;
  lines.forEach((line, idx) => {
    let match;
    while ((match = emptyButtonTagRegex.exec(line)) !== null) {
      const attrs = match[1];
      if (!attrs.includes('aria-label') && !attrs.includes('title')) {
        findings.push({
          file: relPath,
          line: idx + 1,
          type: 'EMPTY_BUTTON',
          snippet: line.trim().slice(0, 100),
          recommendation: 'Button has no readable text, aria-label, or icon child. Add accessible label or icon.',
        });
      }
    }
  });
}

console.log('🔍 Running Enterprise Static Action Auditor on frontend/src...');
scanDirectory(FRONTEND_SRC);

console.log('\n======================================================');
console.log(`📊 Static Action Audit Complete: ${findings.length} findings`);
console.log('======================================================\n');

if (findings.length === 0) {
  console.log('✅ ZERO static action defects found! All buttons, links, and hook dependencies meet standards.');
  process.exit(0);
} else {
  console.log('| Type | File:Line | Snippet | Recommendation |');
  console.log('| :--- | :--- | :--- | :--- |');
  for (const f of findings) {
    console.log(`| ${f.type} | ${f.file}:${f.line} | \`${f.snippet}\` | ${f.recommendation} |`);
  }
  process.exit(findings.some(f => f.type === 'UNSTABLE_HOOK_DEP' || f.type === 'NESTED_BUTTON') ? 1 : 0);
}

