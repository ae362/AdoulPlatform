import { useEffect, useMemo, useRef, useState } from 'react';
import { getBackendWsOrigin } from '../../../utils/backendOrigin';

type Peer = { peerId: string; name: string; role: string };
type RemoteStream = { peer: Peer; stream: MediaStream };

type ConnectParams =
  | { sessionId: string; sessionToken: string; joinToken?: never }
  | { sessionId: string; joinToken: string; sessionToken?: never }
  | { sessionId: string; meetingToken: string; displayName: string; sessionToken?: never; joinToken?: never };

type SignalingMessage =
  | { type: 'welcome'; peer: Peer; peers: Peer[] }
  | { type: 'peer-joined'; peer: Peer }
  | { type: 'peer-left'; peerId: string }
  | { type: 'signal'; from: string; data: any }
  | { type: 'error'; message: string };

function wsBaseUrl() {
  return getBackendWsOrigin();
}

function ensurePeerConnection(opts: {
  peerId: string;
  pcs: Map<string, RTCPeerConnection>;
  localStream: MediaStream | null;
  sendSignal: (to: string, data: any) => void;
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
}) {
  const existing = opts.pcs.get(opts.peerId);
  if (existing) {
    if (opts.localStream) {
      const currentTrackIds = new Set(existing.getSenders().map((s) => s.track?.id).filter(Boolean) as string[]);
      for (const track of opts.localStream.getTracks()) {
        if (!currentTrackIds.has(track.id)) {
          existing.addTrack(track, opts.localStream);
        }
      }
    }
    return existing;
  }

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  });

  if (opts.localStream) {
    for (const track of opts.localStream.getTracks()) {
      pc.addTrack(track, opts.localStream);
    }
  }

  pc.onicecandidate = (ev) => {
    if (ev.candidate) opts.sendSignal(opts.peerId, { candidate: ev.candidate });
  };

  pc.ontrack = (ev) => {
    const [stream] = ev.streams;
    if (stream) opts.onRemoteStream(opts.peerId, stream);
  };

  opts.pcs.set(opts.peerId, pc);
  return pc;
}

function mediaErrorMessage(e: any) {
  const name = String(e?.name || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'تم رفض إذن الكاميرا/الميكروفون. فعّل الإذن من المتصفح ثم أعد المحاولة.';
  }
  if (name === 'NotFoundError') {
    return 'لم يتم العثور على كاميرا أو ميكروفون على هذا الجهاز.';
  }
  if (name === 'NotReadableError') {
    return 'تعذر تشغيل الكاميرا/الميكروفون (قد يكون قيد الاستخدام من تطبيق آخر).';
  }
  if (name === 'OverconstrainedError') {
    return 'إعدادات الجهاز غير مدعومة. جرّب اختيار جهاز آخر أو إعادة التفعيل.';
  }
  if (name === 'SecurityError') {
    return 'يتطلب الوصول للكاميرا/الميكروفون اتصالاً آمناً (HTTPS) أو localhost.';
  }
  if (name === 'AbortError') {
    return 'تم إلغاء طلب تشغيل الكاميرا/الميكروفون.';
  }
  return e?.message ? String(e.message) : 'فشل تشغيل الكاميرا/الميكروفون.';
}

async function acquireMediaWithFallback() {
  const tryGet = async (constraints: MediaStreamConstraints) => {
    try {
      return { ok: true as const, stream: await navigator.mediaDevices.getUserMedia(constraints) };
    } catch (e: any) {
      return { ok: false as const, error: e };
    }
  };

  // Prefer audio+video. If not available, fall back to what's available.
  const both = await tryGet({ video: true, audio: true });
  if (both.ok) return { stream: both.stream, partial: false };

  const errName = String((both as any).error?.name || '');
  if (errName !== 'NotFoundError' && errName !== 'OverconstrainedError') {
    throw (both as any).error;
  }

  const videoOnly = await tryGet({ video: true, audio: false });
  if (videoOnly.ok) return { stream: videoOnly.stream, partial: true };

  const audioOnly = await tryGet({ video: false, audio: true });
  if (audioOnly.ok) return { stream: audioOnly.stream, partial: true };

  throw (both as any).error;
}

export function useRemoteHearingRtc(params: ConnectParams | null) {
  const [selfPeer, setSelfPeer] = useState<Peer | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const selfPeerRef = useRef<Peer | null>(null);
  const peersRef = useRef<Peer[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const sendSignal = (to: string, data: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'signal', to, data }));
  };

  const onRemoteStream = (peerId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const existing = prev.find((x) => x.peer.peerId === peerId);
      if (existing) return prev.map((x) => (x.peer.peerId === peerId ? { ...x, stream } : x));
      const peer = peers.find((p) => p.peerId === peerId) || { peerId, name: 'مشارك', role: 'unknown' };
      return [...prev, { peer, stream }];
    });
  };

  const disconnect = async () => {
    wsRef.current?.close();
    wsRef.current = null;

    for (const pc of pcsRef.current.values()) pc.close();
    pcsRef.current.clear();

    const stream = localStreamRef.current || localStream;
    if (stream) for (const t of stream.getTracks()) t.stop();
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams([]);
    setPeers([]);
    setSelfPeer(null);
    setStatus('idle');
    setError(null);
    setMediaWarning(null);
  };

  const renegotiateAll = async (stream: MediaStream) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const others = peersRef.current.filter((p) => p.peerId !== selfPeerRef.current?.peerId);
    for (const p of others) {
      const pc = ensurePeerConnection({
        peerId: p.peerId,
        pcs: pcsRef.current,
        localStream: stream,
        sendSignal,
        onRemoteStream: (pid, s) => onRemoteStream(pid, s),
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(p.peerId, { description: pc.localDescription });
    }
  };

  const startMedia = async () => {
    try {
      setMediaWarning(null);
      const res = await acquireMediaWithFallback();
      localStreamRef.current = res.stream;
      setLocalStream(res.stream);
      if (res.partial) setMediaWarning('تم تشغيل ما هو متاح من الكاميرا/الميكروفون. بعض الأجهزة غير متوفرة.');
      await renegotiateAll(res.stream);
      return true;
    } catch (e: any) {
      setMediaWarning(mediaErrorMessage(e));
      return false;
    }
  };

  useEffect(() => {
    if (!params) return;
    let cancelled = false;

    (async () => {
      setStatus('connecting');
      setError(null);
      setMediaWarning(null);

      const qs = new URLSearchParams();
      if ('sessionToken' in params) qs.set('sessionToken', params.sessionToken);
      if ('joinToken' in params) qs.set('joinToken', params.joinToken);
      if ('meetingToken' in params) {
        qs.set('meetingToken', params.meetingToken);
        qs.set('name', params.displayName || 'ضيف');
      }
      const wsUrl = `${wsBaseUrl()}/ws/remote-hearing/${params.sessionId}?${qs.toString()}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setStatus('connected');
      };

      ws.onerror = () => {
        if (cancelled) return;
        setStatus('error');
        setError('WebSocket error');
      };

      ws.onmessage = async (ev) => {
        const msg = (() => {
          try {
            return JSON.parse(String(ev.data)) as SignalingMessage;
          } catch {
            return null;
          }
        })();
        if (!msg || cancelled) return;

        if (msg.type === 'error') {
          setStatus('error');
          setError(msg.message);
          return;
        }

        if (msg.type === 'welcome') {
          setSelfPeer(msg.peer);
          selfPeerRef.current = msg.peer;
          const allPeers = [msg.peer, ...msg.peers];
          peersRef.current = allPeers;
          setPeers(allPeers);

          // If media already started, initiate offers. Otherwise, user can start media later.
          if (localStreamRef.current) await renegotiateAll(localStreamRef.current);
          return;
        }

        if (msg.type === 'peer-joined') {
          setPeers((prev) => {
            if (prev.some((p) => p.peerId === msg.peer.peerId)) return prev;
            const next = [...prev, msg.peer];
            peersRef.current = next;
            return next;
          });
          // Existing peers wait for offers from the newly joined peer.
          return;
        }

        if (msg.type === 'peer-left') {
          setPeers((prev) => prev.filter((p) => p.peerId !== msg.peerId));
          setRemoteStreams((prev) => prev.filter((x) => x.peer.peerId !== msg.peerId));
          const pc = pcsRef.current.get(msg.peerId);
          if (pc) {
            pc.close();
            pcsRef.current.delete(msg.peerId);
          }
          return;
        }

        if (msg.type === 'signal') {
          const from = msg.from;
          const pc = ensurePeerConnection({
            peerId: from,
            pcs: pcsRef.current,
            localStream: localStreamRef.current,
            sendSignal,
            onRemoteStream: (pid, s) => onRemoteStream(pid, s),
          });

          if (msg.data?.description) {
            const desc = msg.data.description as RTCSessionDescriptionInit;
            await pc.setRemoteDescription(desc);
            if (desc.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal(from, { description: pc.localDescription });
            }
          } else if (msg.data?.candidate) {
            try {
              await pc.addIceCandidate(msg.data.candidate as RTCIceCandidateInit);
            } catch {
              // ignore
            }
          }
        }
      };

      // Better close diagnostics
      ws.addEventListener('close', (ev) => {
        if (cancelled) return;
        const details = `WebSocket closed (code ${ev.code}${ev.reason ? `, reason: ${ev.reason}` : ''})`;
        setStatus('error');
        setError(details);
        // eslint-disable-next-line no-console
        console.warn('[remote-hearing] ws closed', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
      });
    })().catch((e: any) => {
      if (cancelled) return;
      setStatus('error');
      setError(e?.message || String(e));
    });

    return () => {
      cancelled = true;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.sessionId, (params as any)?.sessionToken, (params as any)?.joinToken, (params as any)?.meetingToken, (params as any)?.displayName]);

  const peersWithoutSelf = useMemo(() => peers.filter((p) => p.peerId !== selfPeer?.peerId), [peers, selfPeer?.peerId]);

  return {
    status,
    error,
    mediaWarning,
    localStream,
    remoteStreams,
    peers: peersWithoutSelf,
    selfPeer,
    startMedia,
    disconnect,
  };
}
