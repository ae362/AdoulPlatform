import { getBackendHttpOrigin } from './backendOrigin';

export function releaseStuViaBeacon() {
  const url = `${getBackendHttpOrigin()}/stu/release`;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url);
      return;
    }
  } catch {
    // ignore
  }

  try {
    // Fallback for browsers that don't support sendBeacon.
    void fetch(url, { method: 'POST', keepalive: true, mode: 'cors' });
  } catch {
    // ignore
  }
}
