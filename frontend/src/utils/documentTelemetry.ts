export type TelemetryEvent =
  | 'DOC_FETCH_START'
  | 'DOC_FETCH_SUCCESS'
  | 'RENDER_START'
  | 'RENDER_COMPLETE'
  | 'ANNOTATION_SAVE'
  | 'SAVED_RASM_CREATED'
  | 'VIEWER_ERROR';

export interface TelemetryLogEntry {
  timestamp: string;
  environment: string;
  event: TelemetryEvent;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Lightweight, non-blocking telemetry logging utility for tracking document viewing operations.
 * Appends ISO timestamp and environment metadata, outputs formatted JSON in dev mode,
 * and fails silently on any logging error.
 */
export function logViewerEvent(event: TelemetryEvent, payload?: Record<string, unknown>): void {
  try {
    const isDev =
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

    const env =
      (typeof import.meta !== 'undefined' && import.meta.env?.MODE) ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV) ||
      'development';

    const logEntry: TelemetryLogEntry = {
      timestamp: new Date().toISOString(),
      environment: String(env),
      event,
      payload,
    };

    if (isDev) {
      console.log(
        `%c[DocumentTelemetry] [${logEntry.timestamp}] [${event}]`,
        'color: #0284c7; font-weight: bold;',
        JSON.stringify(logEntry, null, 2)
      );
    } else {
      // In production mode, forward to global structured logger if present
      if (typeof window !== 'undefined' && (window as any).__JUDICIAL_TELEMETRY_PROVIDER__?.log) {
        (window as any).__JUDICIAL_TELEMETRY_PROVIDER__.log(logEntry);
      }
    }
  } catch {
    // Fail silently without interrupting the primary UI thread
  }
}
