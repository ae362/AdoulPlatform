import WebSocket from 'ws';

type PendingTicket = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
};

type WacomResponse = {
  ticket?: number;
  success?: boolean;
  data?: any;
  error?: string;
};

export class WacomProxyClient {
  private ws: WebSocket;
  private pending = new Map<number, PendingTicket>();
  private nextTicket = 1;
  private recvBuffer = '';

  constructor(url: string) {
    this.ws = new WebSocket(url, { rejectUnauthorized: false });

    this.ws.on('message', (raw: WebSocket.RawData) => {
      const data = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
      if (!data) return;

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
        pending.reject(new Error('Wacom proxy socket closed'));
        this.pending.delete(ticket);
      }
    });

    this.ws.on('error', (err) => {
      console.error('[WacomProxy] WebSocket error:', err);
    });
  }

  async waitForOpen(timeoutMs = 1500): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return;

    return new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Wacom proxy socket open timeout')), timeoutMs);

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
        reject(e instanceof Error ? e : new Error('Wacom proxy socket error'));
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
    let msg: WacomResponse;
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
      pending.reject(new Error(msg.error || 'Wacom proxy RPC failed'));
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
        reject(new Error('Wacom proxy RPC timeout'));
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

/**
 * Test if Wacom service is available at given host:port
 */
export async function isWacomServiceAvailable(host: string = 'localhost', port: number = 9000): Promise<boolean> {
  const url = `ws://${host}:${port}/ws`;
  const client = new WacomProxyClient(url);
  
  try {
    await client.waitForOpen(1500);
    client.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Send command to Wacom service through proxy
 */
export async function sendWacomCommand<T = any>(
  command: Record<string, any>,
  host: string = 'localhost',
  port: number = 9000,
  timeoutMs: number = 1200
): Promise<T> {
  const url = `ws://${host}:${port}/ws`;
  const client = new WacomProxyClient(url);
  
  try {
    await client.waitForOpen(1500);
    const result = await client.send<T>(command, timeoutMs);
    return result;
  } finally {
    client.close();
  }
}
