import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

/**
 * Registers a WebSocket proxy endpoint that forwards Wacom GSS connections
 * from the frontend to the local SigCaptX service on localhost:9000
 * 
 * This allows remote access (via Cloudflare) to work with Wacom devices
 * 
 * Note: Assumes @fastify/websocket is already registered by registerRemoteHearingWebsocket
 */
export async function registerWacomProxy(fastify: FastifyInstance) {
  // Map to track active proxy connections
  const proxies = new Map<string, { clientWs: any; localWs: WebSocket | null }>();
  let proxyCounter = 0;

  // Register at /ws - WacomGSS library expects this path
  // This won't conflict with /ws/hearing/:sessionId from remote hearing
  (fastify as any).websocket('/ws', async (socket: any, req: any) => {
    const proxyId = `wacom-proxy-${++proxyCounter}`;
    let localWs: WebSocket | null = null;

    try {
      fastify.log.info(`[${proxyId}] Wacom proxy connection established`);

      // Connect to local SigCaptX service
      localWs = new WebSocket('ws://localhost:9000/ws', {
        rejectUnauthorized: false,
      });

      proxies.set(proxyId, { clientWs: socket, localWs });

      // Forward messages from local SigCaptX service to frontend client
      localWs.on('message', (data: WebSocket.RawData) => {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(data);
          }
        } catch (err) {
          fastify.log.error({ err, proxyId }, 'Failed to forward message from local to client');
        }
      });

      // Forward messages from frontend client to local SigCaptX service
      socket.on('message', (data: WebSocket.RawData) => {
        try {
          if (localWs && localWs.readyState === WebSocket.OPEN) {
            localWs.send(data);
          }
        } catch (err) {
          fastify.log.error({ err, proxyId }, 'Failed to forward message from client to local');
        }
      });

      // Handle client close
      socket.on('close', () => {
        fastify.log.info(`[${proxyId}] Client disconnected`);
        if (localWs && localWs.readyState === WebSocket.OPEN) {
          localWs.close();
        }
        proxies.delete(proxyId);
      });

      // Handle client error
      socket.on('error', (err: any) => {
        fastify.log.error({ err, proxyId }, 'Client WebSocket error');
        if (localWs && localWs.readyState === WebSocket.OPEN) {
          localWs.close();
        }
        proxies.delete(proxyId);
      });

      // Handle local service close
      localWs.on('close', () => {
        fastify.log.info(`[${proxyId}] Local SigCaptX service disconnected`);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
        proxies.delete(proxyId);
      });

      // Handle local service error
      localWs.on('error', (err: any) => {
        fastify.log.error({ err, proxyId }, 'Local SigCaptX service error');
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1011, 'Local service error');
        }
        proxies.delete(proxyId);
      });
    } catch (err) {
      fastify.log.error({ err, proxyId }, 'Wacom proxy error');
      proxies.delete(proxyId);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, 'Proxy error');
      }
      if (localWs && localWs.readyState === WebSocket.OPEN) {
        localWs.close();
      }
    }
  });

  fastify.log.info('Wacom proxy registered on /ws (for WacomGSS connections)');
}

