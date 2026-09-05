import type { FastifyInstance } from 'fastify';

import WebSocket from 'ws';

type PendingTicket = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
};

type SigCaptXResponse = {
  ticket?: number;
  success?: boolean;
  data?: any;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class SigCaptXClient {
  private ws: WebSocket;
  private pending = new Map<number, PendingTicket>();
  private nextTicket = 1;
  private recvBuffer = '';

  constructor(url: string) {
    this.ws = new WebSocket(url, { rejectUnauthorized: false });

    this.ws.on('message', (raw: WebSocket.RawData) => {
      const data = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
      if (!data) return;

      // Some SigCaptX builds chunk messages with a leading '0'/'1'.
      // Reassemble if needed; otherwise parse directly.
      const header = data[0];
      const payload = data.slice(1);
      const looksChunked = header === '0' || header === '1';

      if (looksChunked) {
        this.recvBuffer += payload;
        if (header === '1') {
          const complete = this.recvBuffer;
          this.recvBuffer = '';
          this.handleJson(complete);
        }
        return;
      }

      this.handleJson(data);
    });

    this.ws.on('close', () => {
      for (const [ticket, pending] of this.pending.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('SigCaptX socket closed'));
        this.pending.delete(ticket);
      }
    });
  }

  async waitForOpen(timeoutMs = 1500) {
    if (this.ws.readyState === WebSocket.OPEN) return;

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('SigCaptX socket open timeout')), timeoutMs);

      const onOpen = () => {
        clearTimeout(t);
        this.ws.off('open', onOpen);
        this.ws.off('error', onError);
        resolve();
      };

      const onError = (e: any) => {
        clearTimeout(t);
        this.ws.off('open', onOpen);
        this.ws.off('error', onError);
        reject(e instanceof Error ? e : new Error('SigCaptX socket error'));
      };

      this.ws.on('open', onOpen);
      this.ws.on('error', onError);
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }

  private handleJson(json: string) {
    let msg: SigCaptXResponse;
    try {
      msg = JSON.parse(json);
    } catch {
      return;
    }

    if (typeof msg.ticket !== 'number') return;

    const pending = this.pending.get(msg.ticket);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pending.delete(msg.ticket);

    if (msg.success && 'data' in msg) {
      pending.resolve(msg.data);
    } else {
      pending.reject(new Error(msg.error || 'SigCaptX RPC failed'));
    }
  }

  private wsSendChunked(str: string) {
    const maxChunkSize = 65535;
    for (let pos = 0; pos < str.length; ) {
      const isLast = pos + maxChunkSize >= str.length;
      const chunk = str.slice(pos, pos + maxChunkSize);
      const header = isLast ? '1' : '0';
      this.ws.send(header + chunk);
      pos += maxChunkSize;
    }
  }

  send<T = any>(object: Record<string, any>, timeoutMs = 1200): Promise<T> {
    const ticket = this.nextTicket++;
    const payload = { ...object, ticket };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(ticket);
        reject(new Error('SigCaptX RPC timeout'));
      }, timeoutMs);

      this.pending.set(ticket, { resolve, reject, timeout });

      try {
        this.wsSendChunked(JSON.stringify(payload));
      } catch (e) {
        clearTimeout(timeout);
        this.pending.delete(ticket);
        reject(e);
      }
    });
  }
}

let inFlightRelease: Promise<any> | null = null;
let lastReleaseAt = 0;

async function tryReleaseOnHost(host: string, port: number) {
  const protocols: Array<'wss' | 'ws'> = ['wss', 'ws'];
  let lastError: any = null;

  for (const proto of protocols) {
    const url = `${proto}://${host}:${port}/ws`;
    const client = new SigCaptXClient(url);
    try {
      await client.waitForOpen(1500);

      // Best-effort: enumerate and attempt a connect→tablet cleanup→disconnect.
      const devices = (await client
        .send<any[]>({ scope: 'WacomGSS.STU.GetUsbDevices', function: 'getUsbDevices' }, 1500)
        .catch(() => [])) as any[];

      if (!Array.isArray(devices) || devices.length === 0) {
        return { host, port, released: false, reason: 'no-devices' as const, proto };
      }

      const wacomDevices = devices.filter((d) => Number(d?.idVendor) === 0x056a);
      const stu540Devices = wacomDevices.filter((d) => {
        const idProduct = Number(d?.idProduct);
        const name = String(d?.model || d?.name || '').toUpperCase();
        return idProduct === 0x00a8 || name.includes('STU-540') || name.includes('540');
      });

      const candidates = (stu540Devices.length ? stu540Devices : wacomDevices.length ? wacomDevices : devices) as any[];

      for (const device of candidates) {
      let intfId: string | null = null;
      let tabletId: string | null = null;

      try {
        const intfRes = await client.send<{ id: string }>({ scope: 'WacomGSS.STU.UsbInterface', function: 'Constructor' });
        intfId = intfRes?.id || null;
        if (!intfId) continue;

        // Attempt non-exclusive first (more forgiving); then exclusive as fallback.
        const tryConnect = async (exclusiveLock: boolean) =>
          client.send({
            scope: 'WacomGSS.STU.UsbInterface',
            id: intfId,
            function: 'connect',
            usbDevice: device,
            exclusiveLock,
          });

        await tryConnect(false).catch(async () => {
          await tryConnect(true);
        });

        const tabletRes = await client
          .send<{ id: string }>(
            {
              scope: 'WacomGSS.STU.Tablet',
              function: 'Constructor',
              hasIntf: true,
              intf: { scope: 'WacomGSS.STU.UsbInterface', id: intfId },
              encryptionHandler: null,
              encryptionHandler2: null,
            },
            1500
          )
          .catch(() => ({ id: '' } as any));

        tabletId = tabletRes?.id || null;

        // Force-release sequence (best-effort)
        if (tabletId) {
          await client
            .send({ scope: 'WacomGSS.STU.Tablet', id: tabletId, function: 'endCapture' })
            .catch(() => undefined);

          await client
            .send({ scope: 'WacomGSS.STU.Tablet', id: tabletId, function: 'setClearScreen' })
            .catch(() => undefined);

          await client
            .send({ scope: 'WacomGSS.STU.Tablet', id: tabletId, function: 'disconnect' })
            .catch(() => undefined);
        }

        await client
          .send({ scope: 'WacomGSS.STU.UsbInterface', id: intfId, function: 'disconnect' })
          .catch(() => undefined);
      } catch {
        // ignore per-device failures
      }
    }

      await sleep(300);
      return { host, port, released: true, proto };
    } catch (e) {
      lastError = e;
    } finally {
      client.close();
    }
  }

  throw lastError || new Error('SigCaptX release failed');
}

async function releaseSigCaptX() {
  // Avoid hammering on repeated unload events.
  const now = Date.now();
  if (now - lastReleaseAt < 800) {
    return { ok: true, skipped: true };
  }
  lastReleaseAt = now;

  // Try common localhost hosts.
  const port = 9000;
  const hosts = ['localhost', '127.0.0.1'];

  let lastErr: any = null;
  for (const host of hosts) {
    try {
      const res = await tryReleaseOnHost(host, port);
      return { ok: true, ...res };
    } catch (e) {
      lastErr = e;
    }
  }

  return { ok: false, error: String(lastErr?.message || lastErr || 'release failed') };
}

export async function registerStuReleaseRoute(app: FastifyInstance) {
  app.route({
    method: ['GET', 'POST'],
    url: '/stu/release',
    handler: async (_req, reply) => {
      if (!inFlightRelease) {
        inFlightRelease = releaseSigCaptX().finally(() => {
          inFlightRelease = null;
        });
      }

      const result = await inFlightRelease;
      // Keep response small; sendBeacon ignores it anyway.
      return reply.code(200).send(result);
    },
  });
}
