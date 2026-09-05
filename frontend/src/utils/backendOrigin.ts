export function getBackendHttpOrigin() {
  const envOrigin = (
    ((import.meta as any).env?.VITE_BACKEND_ORIGIN as string | undefined) ??
    // Back-compat: some setups used VITE_API_URL for the backend origin.
    ((import.meta as any).env?.VITE_API_URL as string | undefined)
  )?.trim();

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';

  const currentPort = window.location.port;
  const currentOrigin = window.location.origin.replace(/\/+$/, '');

  if (envOrigin) {
    const cleaned = envOrigin.replace(/\/+$/, '');

    // Common misconfig in local preview/dev: setting the "backend" origin to the frontend origin
    // (e.g. UI on :4002, backend on :4000) makes /trpc return 404. If we're on localhost and
    // the env origin equals the current origin on a non-backend port, prefer the backend default.
    const parsed =
      (() => {
        try {
          return new URL(cleaned);
        } catch {
          return null;
        }
      })() ?? null;

    const envLooksLikeLocalhost = (() => {
      const host = parsed?.hostname;
      return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    })();

    if (
      isLocalhost &&
      currentPort &&
      currentPort !== '4000' &&
      (cleaned === currentOrigin || (envLooksLikeLocalhost && parsed?.port === currentPort))
    ) {
      return 'http://localhost:4000';
    }

    return cleaned;
  }

  // Local dev/preview convenience: if the UI runs on localhost (any port except the backend),
  // default the API to localhost:4000 (backend/src/server.ts default).
  if (isLocalhost && currentPort && currentPort !== '4000') {
    return 'http://localhost:4000';
  }

  return window.location.origin;
}

export function getBackendWsOrigin() {
  const http = getBackendHttpOrigin();
  if (http.startsWith('https://')) return `wss://${http.slice('https://'.length)}`;
  if (http.startsWith('http://')) return `ws://${http.slice('http://'.length)}`;
  // Fallback: same-origin with protocol swap
  const isHttps = window.location.protocol === 'https:';
  return `${isHttps ? 'wss:' : 'ws:'}//${window.location.host}`;
}
