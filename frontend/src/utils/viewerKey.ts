const ANON_VIEWER_KEY = 'anon_viewer_id';

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreateAnonId() {
  try {
    const existing = localStorage.getItem(ANON_VIEWER_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(ANON_VIEWER_KEY, id);
    return id;
  } catch {
    return `mem:${randomId()}`;
  }
}

export function getViewerKey(userId?: string | null) {
  if (userId) return `user:${userId}`;
  return `anon:${getOrCreateAnonId()}`;
}

