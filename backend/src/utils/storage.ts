import { randomUUID } from 'crypto';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { validateFileSafety, inspectDocxSafety } from './fileSecurity';

const DOCUMENT_BUCKET = 'rasm-files';
let bucketReady: Promise<void> | null = null;

export const fileUploadSchema = z.object({
  name: z.string().min(1, 'اسم الملف مطلوب'),
  type: z.string().optional(),
  size: z.number().max(15 * 1024 * 1024, 'حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميغابايت)'),
  base64: z.string().min(1, 'محتوى الملف مفقود'),
});

function sanitizeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data, error } = await supabase.storage.getBucket(DOCUMENT_BUCKET);
      if ((error && error.message.includes('not found')) || !data) {
        const { error: createError } = await supabase.storage.createBucket(DOCUMENT_BUCKET, {
          public: true,
        });
        if (createError) throw new Error(createError.message);
      }
    })();
  }
  return bucketReady;
}

export async function uploadDocument(file: z.infer<typeof fileUploadSchema>) {
  await ensureBucket();
  const buffer = Buffer.from(file.base64, 'base64');

  // Strict binary signature, extension whitelist, and size validation
  const validation = validateFileSafety(file.name, buffer);

  // If DOCX, inspect zip headers for decompression bombs and embedded macros
  if (validation.extension === 'docx') {
    inspectDocxSafety(buffer);
  }

  const safeName = sanitizeFileName(file.name);
  const path = `${randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, buffer, {
    contentType: validation.detectedMimeType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadBufferToDocumentsBucket(opts: {
  path: string;
  buffer: Buffer;
  contentType: string;
  upsert?: boolean;
}) {
  await ensureBucket();
  const normalizedPath = String(opts.path || '').replace(/^\/+/, '');
  if (!normalizedPath) throw new Error('uploadBufferToDocumentsBucket: path is required');

  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(normalizedPath, opts.buffer, {
    contentType: opts.contentType || 'application/octet-stream',
    upsert: opts.upsert ?? true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(normalizedPath);
  return { url: data.publicUrl, path: normalizedPath };
}
