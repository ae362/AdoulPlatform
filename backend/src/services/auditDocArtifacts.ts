import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { file as tmpFile, dir as tmpDir } from 'tmp-promise';
import * as htmlPdf from 'html-pdf-node';

export type LibreOfficeResult = {
  pdfBuffer: Buffer;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
};

function looksLikeWindowsAbsolutePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value);
}

function looksLikeFilesystemPath(value: string): boolean {
  return value.includes('/') || value.includes('\\') || path.isAbsolute(value) || looksLikeWindowsAbsolutePath(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fallback PDF generator (no LibreOffice needed).
 * Produces a simple, readable A4 PDF from plain text.
 */
export async function convertPlainTextToPdfViaHtml(opts: {
  text: string;
  rtl?: boolean;
}): Promise<{ pdfBuffer: Buffer; durationMs: number }> {
  const t0 = Date.now();
  const rtl = opts.rtl !== false;
  const safe = escapeHtml(String(opts.text ?? '')).replace(/\r\n/g, '\n');
  const html = `<!doctype html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; }
      .content { white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="content">${safe}</div>
  </body>
</html>`;

  const options: htmlPdf.Options = {
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
  };

  const file = { content: html };
  const pdfBuffer = (await htmlPdf.generatePdf(file, options)) as Buffer;
  return { pdfBuffer, durationMs: Date.now() - t0 };
}

function resolveSofficeExecutable(): string {
  const fromEnv =
    process.env.SOFFICE_PATH ||
    process.env.LIBREOFFICE_SOFFICE_PATH ||
    process.env.LIBREOFFICE_PATH;

  if (fromEnv && typeof fromEnv === 'string') {
    const candidate = fromEnv.trim();
    if (candidate) {
      const isWrongPlatformWindowsPath = process.platform !== 'win32' && looksLikeWindowsAbsolutePath(candidate);
      if (!isWrongPlatformWindowsPath) {
        // Accept command names like `soffice`, but ignore broken absolute/relative overrides.
        if (!looksLikeFilesystemPath(candidate) || existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.com',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];
    for (const candidate of candidates) {
      try {
        if (existsSync(candidate)) return candidate;
      } catch {
        // ignore
      }
    }
  }

  return 'soffice';
}

function toFileUrl(p: string): string {
  const abs = path.resolve(p);
  // Convert Windows paths to file URL with forward slashes.
  const normalized = abs.replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
}

function runSoffice(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const executable = resolveSofficeExecutable();
    const child = spawn(executable, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    const killTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(killTimer);

      // Common: LibreOffice not installed or `soffice` not on PATH.
      const code = (err as any)?.code;
      if (code === 'ENOENT') {
        const hint = process.platform === 'win32'
          ? 'Install LibreOffice or set SOFFICE_PATH to your soffice.exe (e.g. C:\\Program Files\\LibreOffice\\program\\soffice.exe).'
          : 'Install LibreOffice and ensure `soffice` is available on PATH (or set SOFFICE_PATH).';

        const wrapped = new Error(`LibreOffice executable not found (attempted: ${executable}). ${hint}`);
        (wrapped as any).cause = err;
        reject(wrapped);
        return;
      }

      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(killTimer);
      resolve({ stdout, stderr, exitCode: code ?? -1, durationMs: Date.now() - t0 });
    });
  });
}

/**
 * Convert DOCX bytes to PDF using LibreOffice (soffice) headless.
 * Requires LibreOffice installed on the server and `soffice` on PATH.
 */
export async function convertDocxToPdfViaLibreOffice(opts: {
  docxBuffer: Buffer;
  timeoutMs?: number;
}): Promise<LibreOfficeResult> {
  const timeoutMs = opts.timeoutMs ?? 60_000;

  const tmpOutDir = await tmpDir({ unsafeCleanup: true });
  const tmpIn = await tmpFile({ postfix: '.docx' });
  const tmpProfileDir = await tmpDir({ unsafeCleanup: true });

  try {
    await writeFile(tmpIn.path, opts.docxBuffer);

    const { stdout, stderr, exitCode, durationMs } = await runSoffice(
      [
        `-env:UserInstallation=${toFileUrl(tmpProfileDir.path)}`,
        '--headless',
        '--nologo',
        '--nolockcheck',
        '--nodefault',
        '--norestore',
        '--invisible',
        '--convert-to',
        'pdf',
        '--outdir',
        tmpOutDir.path,
        tmpIn.path,
      ],
      timeoutMs
    );

    if (exitCode !== 0) {
      const err = new Error(`LibreOffice conversion failed (exit ${exitCode})`);
      (err as any).stdout = stdout;
      (err as any).stderr = stderr;
      throw err;
    }

    const pdfPath = path.join(tmpOutDir.path, path.basename(tmpIn.path).replace(/\.docx$/i, '.pdf'));
    const pdfBuffer = await readFile(pdfPath);

    return { pdfBuffer, stdout, stderr, exitCode, durationMs };
  } finally {
    try {
      await tmpIn.cleanup();
    } catch {}
    try {
      await tmpOutDir.cleanup();
    } catch {}
    try {
      await tmpProfileDir.cleanup();
    } catch {}
  }
}
