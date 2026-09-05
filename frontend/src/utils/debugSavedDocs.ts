export const DEBUG_SAVED_DOCS = false;

export function sdLog(tag: string, payload?: unknown) {
  if (!DEBUG_SAVED_DOCS) return;
  if (payload === undefined) {
    // eslint-disable-next-line no-console
    console.log(`[SD] ${tag}`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[SD] ${tag}`, payload);
}
