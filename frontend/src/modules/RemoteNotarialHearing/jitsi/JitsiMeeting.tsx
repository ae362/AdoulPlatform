import React from 'react';
import { loadJitsiExternalApi } from './loadJitsiApi';

type JitsiApi = any;

function isMeetJitSi(domain: string) {
  return String(domain || '').trim().toLowerCase() === 'meet.jit.si';
}

function describeJitsiError(err: any) {
  if (!err) return 'Unknown Jitsi error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Jitsi error';
  if (typeof err === 'object') {
    if ((err as any).error) return describeJitsiError((err as any).error);
    const name = (err as any).name;
    const message = (err as any).message;
    const type = (err as any).type;
    if (name && message) return `${name}: ${message}`;
    if (name && type) return `${name}: ${type}`;
    if (message) return String(message);
    try {
      return JSON.stringify(err);
    } catch {
      // ignore
    }
  }
  return String(err);
}

export default function JitsiMeeting(props: {
  domain: string;
  roomName: string;
  displayName: string;
  onStatus?: (s: 'connecting' | 'connected' | 'left' | 'error', details?: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const apiRef = React.useRef<JitsiApi | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!props.roomName) {
      props.onStatus?.('error', 'Missing room name');
      return () => {};
    }

    props.onStatus?.('connecting');

    (async () => {
      await loadJitsiExternalApi(props.domain);
      if (cancelled) return;
      if (!containerRef.current) return;

      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      if (!JitsiMeetExternalAPI) throw new Error('JitsiMeetExternalAPI not found');

      const api = new JitsiMeetExternalAPI(props.domain, {
        roomName: props.roomName,
        parentNode: containerRef.current,
        userInfo: { displayName: props.displayName },
        configOverwrite: {
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          useHostPageLocalStorage: true,
        },
        interfaceConfigOverwrite: {
          DEFAULT_REMOTE_DISPLAY_NAME: 'مشارك',
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'invite',
            'desktop',
            'raisehand',
            'chat',
            'tileview',
            'fullscreen',
            'hangup',
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      });

      apiRef.current = api;

      api.addListener('videoConferenceJoined', () => props.onStatus?.('connected'));
      api.addListener('readyToClose', () => props.onStatus?.('left'));
      api.addListener('conferenceFailed', (e: any) => {
        const msg = describeJitsiError(e);
        const hint = isMeetJitSi(props.domain)
          ? ' (ملاحظة: meet.jit.si قد يقيّد التشغيل داخل iframe. استخدم خادم Jitsi خاص للحصول على دمج ثابت.)'
          : '';
        props.onStatus?.('error', `conferenceFailed: ${msg}${hint}`);
      });
      api.addListener('connectionFailed', (e: any) => {
        const msg = describeJitsiError(e);
        const hint = isMeetJitSi(props.domain)
          ? ' (ملاحظة: meet.jit.si قد يقيّد التشغيل داخل iframe. استخدم خادم Jitsi خاص للحصول على دمج ثابت.)'
          : '';
        props.onStatus?.('error', `connectionFailed: ${msg}${hint}`);
      });
      api.addListener('errorOccurred', (e: any) => props.onStatus?.('error', describeJitsiError(e)));

      try {
        api.executeCommand?.('displayName', props.displayName);
      } catch {
        // ignore
      }
    })().catch((e: any) => {
      if (cancelled) return;
      props.onStatus?.('error', describeJitsiError(e));
    });

    return () => {
      cancelled = true;
      try {
        apiRef.current?.dispose?.();
      } catch {
        // ignore
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.domain, props.roomName]);

  React.useEffect(() => {
    try {
      apiRef.current?.executeCommand?.('displayName', props.displayName);
    } catch {
      // ignore
    }
  }, [props.displayName]);

  return <div ref={containerRef} className="w-full h-full" />;
}
