export function buildJitsiUrl(domain: string, roomName: string) {
  const d = String(domain || '').trim() || 'meet.jit.si';
  const r = String(roomName || '').trim().replace(/^\/+/, '');
  return `https://${d}/${encodeURIComponent(r)}`;
}

export function isPublicMeetJitSi(domain: string) {
  return String(domain || '').trim().toLowerCase() === 'meet.jit.si';
}

