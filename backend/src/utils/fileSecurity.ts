/**
 * Enterprise File Security Engine
 * Defense-in-depth against malicious file uploads, extension spoofing,
 * script execution (.py, .sh, .exe, .php, etc.), and zip/decompression bombs.
 */

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
}

export const DEFAULT_ALLOWED_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'jpg',
  'jpeg',
  'png',
  'webp',
];

export const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const DANGEROUS_EXTENSIONS = new Set([
  'py', 'pyw', 'pyc', 'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1', 'psm1',
  'exe', 'dll', 'so', 'dylib', 'bin', 'msi', 'com', 'scr', 'vbs', 'vbe',
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'php', 'phtml', 'php3', 'php4', 'php5',
  'html', 'htm', 'xhtml', 'shtml', 'svg', 'xml',
  'jar', 'war', 'ear', 'class',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'iso',
  'docm', 'xlsm', 'pptm', // Macro-enabled office docs
]);

export interface ValidatedFileResult {
  safeName: string;
  extension: string;
  detectedMimeType: string;
  sizeBytes: number;
}

/**
 * Validates binary signature (magic numbers) of the buffer.
 */
export function detectBinaryType(buffer: Buffer): { extension: string; mime: string } | null {
  if (!buffer || buffer.length < 4) return null;

  // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { extension: 'pdf', mime: 'application/pdf' };
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: 'png', mime: 'image/png' };
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50   // WEBP
  ) {
    return { extension: 'webp', mime: 'image/webp' };
  }

  // ZIP / DOCX: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return { extension: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  // Legacy Word Document (Compound File Binary Format): 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 && buffer[5] === 0xb1 && buffer[6] === 0x1a && buffer[7] === 0xe1
  ) {
    return { extension: 'doc', mime: 'application/msword' };
  }

  return null;
}

/**
 * Validates file name, extension, size, and binary signature.
 */
export function validateFileSafety(
  rawName: string,
  buffer: Buffer,
  opts?: FileValidationOptions
): ValidatedFileResult {
  const maxSizeBytes = opts?.maxSizeBytes ?? MAX_UPLOAD_SIZE_BYTES;
  const allowedExtensions = opts?.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;

  if (!buffer || buffer.length === 0) {
    throw new Error('Security Error: Uploaded file is empty');
  }

  if (buffer.length > maxSizeBytes) {
    throw new Error(`Security Error: File size exceeds the maximum permitted limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`);
  }

  // Extract clean extension
  const safeName = rawName.replace(/[^A-Za-z0-9._-]/g, '_');
  const dotIndex = safeName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === safeName.length - 1) {
    throw new Error('Security Error: File must have a valid extension');
  }

  const extension = safeName.slice(dotIndex + 1).toLowerCase();

  // 1. Immediate rejection of dangerous file types
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    throw new Error(`Security Error: File type .${extension} is strictly forbidden for security reasons`);
  }

  // 2. Strict Whitelist
  if (!allowedExtensions.includes(extension)) {
    throw new Error(`Security Error: Unsupported file format .${extension}. Permitted: ${allowedExtensions.join(', ')}`);
  }

  // 3. Binary Magic Number verification
  const detected = detectBinaryType(buffer);
  if (!detected) {
    throw new Error('Security Error: File content does not match any allowed binary format or is corrupted');
  }

  // Map jpg/jpeg equivalence
  const isJpgMatch = (extension === 'jpg' || extension === 'jpeg') && detected.extension === 'jpg';
  const isDocxMatch = (extension === 'docx' || extension === 'doc') && (detected.extension === 'docx' || detected.extension === 'doc');

  if (detected.extension !== extension && !isJpgMatch && !isDocxMatch) {
    throw new Error(`Security Error: File extension .${extension} does not match actual binary content (.${detected.extension})`);
  }

  return {
    safeName,
    extension,
    detectedMimeType: detected.mime,
    sizeBytes: buffer.length,
  };
}

/**
 * Zip Bomb & Malicious DOCX Inspector
 * Parses zip headers (without decompressing the payload) to defend against:
 * 1. Decompression bombs (excessive uncompressed size or ratio > 50:1)
 * 2. Nested macro/executable payloads (vbaProject.bin, .exe, .py, etc.)
 * 3. Path traversal attacks (../ in entry paths)
 */
export function inspectDocxSafety(docxBuffer: Buffer): void {
  if (!docxBuffer || docxBuffer.length < 22) {
    throw new Error('Security Error: Invalid DOCX payload');
  }

  // Validate PK\x03\x04 header
  if (docxBuffer[0] !== 0x50 || docxBuffer[1] !== 0x4b) {
    throw new Error('Security Error: DOCX does not contain valid zip structure');
  }

  const MAX_UNCOMPRESSED_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB
  const MAX_COMPRESSION_RATIO = 50; // 50:1 ratio limit
  const MAX_ENTRY_COUNT = 500;

  let totalUncompressedSize = 0;
  let entryCount = 0;
  let offset = 0;

  while (offset + 30 <= docxBuffer.length) {
    // Look for Local File Header signature 0x04034b50 (PK\x03\x04)
    if (
      docxBuffer[offset] === 0x50 &&
      docxBuffer[offset + 1] === 0x4b &&
      docxBuffer[offset + 2] === 0x03 &&
      docxBuffer[offset + 3] === 0x04
    ) {
      entryCount++;
      if (entryCount > MAX_ENTRY_COUNT) {
        throw new Error('Security Error: Excessive file count inside archive (possible zip bomb)');
      }

      const compressedSize = docxBuffer.readUInt32LE(offset + 18);
      const uncompressedSize = docxBuffer.readUInt32LE(offset + 22);
      const fileNameLength = docxBuffer.readUInt16LE(offset + 26);
      const extraFieldLength = docxBuffer.readUInt16LE(offset + 28);

      const fileNameStart = offset + 30;
      const fileNameEnd = fileNameStart + fileNameLength;

      if (fileNameEnd <= docxBuffer.length) {
        const entryName = docxBuffer.toString('utf8', fileNameStart, fileNameEnd);

        // Path Traversal Check
        if (entryName.includes('..') || entryName.startsWith('/') || entryName.startsWith('\\')) {
          throw new Error('Security Error: Path traversal attempt detected in DOCX archive');
        }

        // Macro & Forbidden Script Check
        const lowerName = entryName.toLowerCase();
        if (
          lowerName.includes('vbaproject.bin') ||
          lowerName.endsWith('.exe') ||
          lowerName.endsWith('.py') ||
          lowerName.endsWith('.sh') ||
          lowerName.endsWith('.bat') ||
          lowerName.endsWith('.ps1') ||
          lowerName.endsWith('.js')
        ) {
          throw new Error(`Security Error: Forbidden active script or macro (${entryName}) detected inside DOCX`);
        }
      }

      totalUncompressedSize += uncompressedSize;

      // Check cumulative size
      if (totalUncompressedSize > MAX_UNCOMPRESSED_TOTAL_BYTES) {
        throw new Error('Security Error: DOCX uncompressed size exceeds maximum safety limit (50MB decompression bomb defense)');
      }

      // Check compression ratio if significant compressed size
      if (compressedSize > 1024 && (uncompressedSize / compressedSize) > MAX_COMPRESSION_RATIO) {
        throw new Error('Security Error: Abnormal compression ratio detected (decompression bomb defense)');
      }

      // Advance past this local header and its data
      offset = fileNameStart + fileNameLength + extraFieldLength + compressedSize;
    } else {
      // Look for Central Directory signature 0x02014b50 or End of Central Directory 0x06054b50
      if (
        (docxBuffer[offset] === 0x50 && docxBuffer[offset + 1] === 0x4b && docxBuffer[offset + 2] === 0x01 && docxBuffer[offset + 3] === 0x02) ||
        (docxBuffer[offset] === 0x50 && docxBuffer[offset + 1] === 0x4b && docxBuffer[offset + 2] === 0x05 && docxBuffer[offset + 3] === 0x06)
      ) {
        break;
      }
      offset++;
    }
  }
}
