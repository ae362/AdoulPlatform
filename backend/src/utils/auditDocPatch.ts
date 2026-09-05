import { createHash } from 'crypto';
import { z } from 'zod';

// Patch schema v1

export const patchOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('set_plain_text'),
    value: z.string(),
  }),
  z.object({
    op: z.literal('append_plain_text'),
    value: z.string(),
  }),
  z.object({
    op: z.literal('replace'),
    key: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    op: z.literal('raw_text_replace'),
    from: z.string(),
    to: z.string(),
    all: z.boolean().optional(),
  }),
]);

export const patchSchemaV1 = z.object({
  version: z.literal(1),
  ops: z.array(patchOpSchema).min(1),
});

export type AuditDocPatchV1 = z.infer<typeof patchSchemaV1>;
export type AuditDocPatchOp = z.infer<typeof patchOpSchema>;

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const stringify = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(stringify);
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    const keys = Object.keys(v).sort();
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = stringify(v[k]);
    return out;
  };

  return JSON.stringify(stringify(value));
}

export function sha256Hex(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function patchSha256(patch: AuditDocPatchV1): { stableJson: string; sha256: string } {
  const stableJson = stableStringify(patch);
  return { stableJson, sha256: sha256Hex(stableJson) };
}

export function applyPatchToText(opts: {
  baseText: string;
  patch: AuditDocPatchV1;
}): { text: string; appliedOps: number } {
  let text = opts.baseText;
  let appliedOps = 0;

  for (const op of opts.patch.ops) {
    if (op.op === 'set_plain_text') {
      text = op.value;
      appliedOps += 1;
      continue;
    }
    if (op.op === 'append_plain_text') {
      const addition = op.value ?? '';
      if (addition) {
        text = `${text}${addition}`;
      }
      appliedOps += 1;
      continue;
    }
    if (op.op === 'replace') {
      const token = `{{${op.key}}}`;
      text = text.split(token).join(op.value);
      appliedOps += 1;
      continue;
    }
    if (op.op === 'raw_text_replace') {
      const replaceAll = op.all !== false;
      if (replaceAll) {
        text = text.split(op.from).join(op.to);
      } else {
        text = text.replace(op.from, op.to);
      }
      appliedOps += 1;
      continue;
    }

    // Exhaustiveness
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _never: never = op;
  }

  return { text, appliedOps };
}
