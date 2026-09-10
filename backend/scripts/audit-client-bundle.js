/**
 * Client Bundle Secret Leakage Audit
 * Scans compiled frontend distribution assets (dist-build/assets) and src
 * to ensure no backend secrets or private keys are exposed to the client.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist-build/assets');
const FRONTEND_SRC = path.resolve(__dirname, '../../frontend/src');

const FORBIDDEN_SECRET_PATTERNS = [
  { name: 'Private Key PEM', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i },
  { name: 'Service Role Key Declaration', regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][a-zA-Z0-9_\-\.]+['"]/i },
  { name: 'Database Password Declaration', regex: /POSTGRES_PASSWORD\s*=\s*['"][^'"]+['"]/i },
  { name: 'JWT Secret Declaration', regex: /JWT_SECRET\s*=\s*['"][a-zA-Z0-9_\-\.]{16,}['"]/i },
  { name: 'Cookie Secret Declaration', regex: /COOKIE_SECRET\s*=\s*['"][a-zA-Z0-9_\-\.]{16,}['"]/i },
  { name: 'Mailjet Secret Declaration', regex: /MAILJET_API_SECRET\s*=\s*['"][a-zA-Z0-9]+['"]/i },
];

function scanDirectory(dirPath) {
  const violations = [];
  if (!fs.existsSync(dirPath)) {
    return violations;
  }

  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (/\.(js|ts|tsx|html|json)$/i.test(file.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
        if (pattern.regex.test(content)) {
          violations.push({
            file: path.relative(path.resolve(__dirname, '../..'), fullPath),
            secretType: pattern.name,
          });
        }
      }
    }
  }

  return violations;
}

console.log('🔒 Starting Pre-Launch Client Secrets Leak Audit...');

let distViolations = [];
if (fs.existsSync(FRONTEND_DIST)) {
  console.log(`Checking compiled bundle at: ${FRONTEND_DIST}`);
  distViolations = scanDirectory(FRONTEND_DIST);
} else {
  console.log('Notice: dist-build not yet generated, auditing frontend/src directly...');
}

console.log(`Checking source code at: ${FRONTEND_SRC}`);
const srcViolations = scanDirectory(FRONTEND_SRC);

const totalViolations = [...distViolations, ...srcViolations];

if (totalViolations.length > 0) {
  console.error('\n❌ CRITICAL: Server secrets detected in client bundle/source:');
  totalViolations.forEach((v) => {
    console.error(`  - [${v.secretType}] in ${v.file}`);
  });
  process.exit(1);
} else {
  console.log('✅ PASS: Zero server secrets or private keys detected in frontend code/assets.\n');
  process.exit(0);
}

