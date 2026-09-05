import { supabase } from '../services/supabase';

const RECORDINGS_BUCKET = process.env.REMOTE_HEARING_RECORDINGS_BUCKET || 'remote-hearing-recordings';
let bucketReady: Promise<void> | null = null;

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data, error } = await supabase.storage.getBucket(RECORDINGS_BUCKET);
      if ((error && String(error.message || '').includes('not found')) || !data) {
        const { error: createError } = await supabase.storage.createBucket(RECORDINGS_BUCKET, {
          public: false,
        });
        if (createError) throw new Error(createError.message);
      }
    })();
  }
  return bucketReady;
}

export function getRecordingsBucketName() {
  return RECORDINGS_BUCKET;
}

export async function createSignedRecordingUploadUrl(path: string) {
  await ensureBucket();
  const { data, error } = await supabase.storage.from(RECORDINGS_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed upload URL');
  return data as { signedUrl: string; path: string; token: string };
}

export async function createSignedRecordingDownloadUrl(path: string, expiresInSeconds: number) {
  await ensureBucket();
  const { data, error } = await supabase.storage.from(RECORDINGS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed download URL');
  return data as { signedUrl: string };
}

