let loadingPromise: Promise<void> | null = null;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export function loadJitsiExternalApi(domain: string) {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const src = `https://${domain}/external_api.js`;
  loadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi external_api.js')), { once: true });
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Jitsi external_api.js'));
    document.head.appendChild(s);
  });

  return loadingPromise;
}

