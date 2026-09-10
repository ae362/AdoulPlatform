import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase';
import { CacheService } from '../services/cacheService';

type PeerInfo = {
  peerId: string;
  name: string;
  role: string;
  userId?: string | null;
  participantId?: string | null;
};

type Room = Map<string, { socket: any; peer: PeerInfo }>;

const rooms: Map<string, Room> = new Map();

function getRoom(sessionId: string) {
  let room = rooms.get(sessionId);
  if (!room) {
    room = new Map();
    rooms.set(sessionId, room);
  }
  return room;
}

async function authBySessionToken(sessionId: string, sessionToken: string): Promise<PeerInfo> {
  const sessionRes = await CacheService.verifySessionWithCache(sessionToken, supabase);
  if (!sessionRes || !sessionRes.user) throw new Error('Invalid or expired session');
  const user = sessionRes.user;
  if (!user.is_active) throw new Error('User inactive');

  const { data: hearing, error: hearingError } = await supabase
    .from('remote_hearing_sessions')
    .select('id, notary1_user_id, notary2_user_id, created_by_user_id, assigned_judge_user_id')
    .eq('id', sessionId)
    .single();
  if (hearingError || !hearing) throw new Error('Session not found');

  const isNotary = user.role === 'notary' && (hearing.notary1_user_id === user.id || hearing.notary2_user_id === user.id || hearing.created_by_user_id === user.id);
  const isJudge = user.role === 'authentication_judge' && hearing.assigned_judge_user_id === user.id;
  const isOversight = user.role === 'regional_adoul_council' || user.role === 'national_notary_authority';
  let isCollaborator = false;
  if (!isNotary && user.role === 'notary') {
    const { data: collab } = await supabase
      .from('remote_hearing_collaborators')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();
    isCollaborator = !!collab;
  }

  if (!isNotary && !isJudge && !isOversight && !isCollaborator) throw new Error('Not allowed');

  const role = isJudge ? 'judge' : isNotary || isCollaborator ? 'notary' : 'oversight';
  return { peerId: randomUUID(), name: user.full_name || 'مستخدم', role, userId: user.id, participantId: null };
}

async function authByJoinToken(sessionId: string, joinToken: string): Promise<PeerInfo> {
  const { data: participant, error } = await supabase
    .from('remote_hearing_participants')
    .select('id, session_id, full_name, participant_role')
    .eq('join_token', joinToken)
    .single();
  if (error || !participant) throw new Error('Invalid join token');
  if (participant.session_id !== sessionId) throw new Error('Token session mismatch');

  const role = String(participant.participant_role || 'party');
  return { peerId: randomUUID(), name: participant.full_name || 'طرف', role, userId: null, participantId: participant.id };
}

async function authByMeetingToken(sessionId: string, meetingToken: string, displayName: string | null): Promise<PeerInfo> {
  const { data: session, error } = await supabase
    .from('remote_hearing_sessions')
    .select('id, meeting_join_enabled, meeting_join_token, meeting_join_expires_at')
    .eq('id', sessionId)
    .single();
  if (error || !session) throw new Error('Session not found');
  if (!session.meeting_join_enabled) throw new Error('Meeting link disabled');
  if (!session.meeting_join_token || session.meeting_join_token !== meetingToken) throw new Error('Invalid meeting token');
  if (session.meeting_join_expires_at && new Date(session.meeting_join_expires_at).getTime() < Date.now()) throw new Error('Meeting link expired');

  const name = (displayName || '').trim() || 'ضيف';
  return { peerId: randomUUID(), name, role: 'guest', userId: null, participantId: null };
}

function safeJsonParse(txt: string) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function send(ws: any, msg: any) {
  ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, msg: any, exceptPeerId?: string) {
  for (const [peerId, entry] of room.entries()) {
    if (exceptPeerId && peerId === exceptPeerId) continue;
    send(entry.socket, msg);
  }
}

export async function registerRemoteHearingWebsocket(app: FastifyInstance) {
  // Must be registered synchronously before `listen()` to avoid "register after ready/listen" issues.
  app.register(websocket);

  app.get('/ws/remote-hearing/:sessionId', { websocket: true }, async (connection: any, req: any) => {
    const sessionId = String((req.params as any).sessionId);
    const url = new URL(String(req.url), 'http://localhost');
    const sessionToken = url.searchParams.get('sessionToken') || '';
    const joinToken = url.searchParams.get('joinToken') || '';
    const meetingToken = url.searchParams.get('meetingToken') || '';
    const displayName = url.searchParams.get('name');

    let peer: PeerInfo;
    try {
      peer = sessionToken
        ? await authBySessionToken(sessionId, sessionToken)
        : meetingToken
          ? await authByMeetingToken(sessionId, meetingToken, displayName)
          : await authByJoinToken(sessionId, joinToken);
    } catch (e: any) {
      req.log?.warn?.({ sessionId, err: e?.message || String(e) }, 'remote-hearing ws auth failed');
      try {
        send(connection.socket, { type: 'error', message: e?.message || 'Unauthorized' });
      } finally {
        // Give the client a chance to receive the error message before closing.
        setTimeout(() => {
          try {
            connection.socket.close(1008, 'Unauthorized');
          } catch {
            connection.socket.close();
          }
        }, 50);
      }
      return;
    }

    const room = getRoom(sessionId);
    room.set(peer.peerId, { socket: connection.socket, peer });

    const peers = Array.from(room.values())
      .map((x) => x.peer)
      .filter((p) => p.peerId !== peer.peerId);

    send(connection.socket, { type: 'welcome', peer, peers });
    broadcast(room, { type: 'peer-joined', peer }, peer.peerId);

    connection.socket.on('message', (raw: any) => {
      const msg = safeJsonParse(String(raw));
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'signal' && typeof msg.to === 'string') {
        const target = room.get(msg.to);
        if (!target) return;
        send(target.socket, { type: 'signal', from: peer.peerId, data: msg.data });
        return;
      }

      if (msg.type === 'ping') {
        send(connection.socket, { type: 'pong', t: Date.now() });
      }
    });

    connection.socket.on('close', (code: number, reason: any) => {
      req.log?.info?.({ sessionId, peerId: peer.peerId, code, reason: String(reason || '') }, 'remote-hearing ws closed');
      room.delete(peer.peerId);
      broadcast(room, { type: 'peer-left', peerId: peer.peerId });
      if (room.size === 0) rooms.delete(sessionId);
    });
  });
}
