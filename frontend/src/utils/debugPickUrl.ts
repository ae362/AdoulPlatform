import { DEBUG_SAVED_DOCS } from './debugSavedDocs';

type PickContext = 'auto_select' | 'user_select';

export function debugPickUrl(
  context: PickContext,
  details: {
    rasmId: string;
    attachmentId?: string | null;
    versionId?: string | null;
    category?: string | null;
    mime?: string | null;
    url?: string | null;
    reason: string;
  }
) {
  if (!DEBUG_SAVED_DOCS) return;
  try {
    console.log({
      context,
      rasmId: details.rasmId,
      attachmentId: details.attachmentId ?? null,
      versionId: details.versionId ?? null,
      category: details.category ?? null,
      mime: details.mime ?? null,
      url: details.url ?? null,
      reason: details.reason,
    });
  } catch {
    // ignore
  }
}
