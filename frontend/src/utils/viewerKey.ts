const ANON_VIEWER_KEY = 'anon_viewer_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'id_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
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

