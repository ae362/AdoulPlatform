import { randomUUID } from 'crypto';
import { z } from 'zod';
import { supabase } from '../services/supabase';

const DOCUMENT_BUCKET = 'rasm-files';
let bucketReady: Promise<void> | null = null;

export const fileUploadSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  base64: z.string(),
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
  const safeName = sanitizeFileName(file.name);
  const path = `${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(file.base64, 'base64');
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
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
