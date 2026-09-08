import { useMemo } from 'react';
import { trpc } from '../trpc';

/**
 * Resolves the canonical active PDF stream for Judicial Speech in strict descending priority.
 * Appends cache-busting timestamp to bypass stale browser cache when appropriate.
 */
export function getJudicialSpeechDocument(
  submissionData: any,
  previewOverrideUrl?: string | null
): string {
  if (previewOverrideUrl && typeof previewOverrideUrl === 'string' && previewOverrideUrl.trim()) {
    return applyCacheBuster(previewOverrideUrl.trim());
  }

  const rasm = submissionData?.savedRasm;
  const payload = submissionData?.payload || {};

  // Strict descending priority for canonical PDF streams:
  // 1. Signed PDF directly on saved_rasm
  // 2. Latest signing PDF url
  // 3. PDF preview url
  // 4. Payload draft/signing/preview pointers
  // 5. Submission-level previewUrl
  // 6. Primary docx url fallback
  const candidateUrl: string | null =
    rasm?.signed_pdf_url ||
    rasm?.latest_signing_pdf_url ||
    rasm?.pdf_preview_url ||
    rasm?.payload?.latestDraftPdfUrl ||
    rasm?.payload?.latestSigningPdfUrl ||
    rasm?.payload?.signedPdfUrl ||
    rasm?.payload?.previewUrl ||
    submissionData?.previewUrl ||
    payload?.latestSigningPdfUrl ||
    payload?.signedPdfUrl ||
    payload?.previewUrl ||
    payload?.latestDraftPdfUrl ||
    rasm?.primary_docx_url ||
    null;

  if (candidateUrl && typeof candidateUrl === 'string' && candidateUrl.trim()) {
    return applyCacheBuster(candidateUrl.trim());
  }

  // Scan attachments array if present
  const attachments = Array.isArray(submissionData?.attachments)
    ? submissionData.attachments
    : Array.isArray(payload?.attachments)
    ? payload.attachments
    : [];

  for (const att of attachments) {
    const url = String(att?.fileUrl || att?.file_url || att?.url || '').trim();
    const mime = String(att?.mimeType || att?.mime_type || '').toLowerCase();
    const name = String(att?.fileName || att?.name || '').toLowerCase();
    if (url && (mime.includes('pdf') || name.endsWith('.pdf') || url.toLowerCase().includes('.pdf'))) {
      return applyCacheBuster(url);
    }
  }

  return '';
}

/**
 * Appends cache buster timestamp to HTTP/HTTPS/relative URLs
 */
export function applyCacheBuster(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const timestamp = Date.now();
  if (url.includes('cb=')) {
    return url.replace(/cb=\d+/, 'cb=' + timestamp);
  }
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + 'cb=' + timestamp;
}

/**
 * Formats PDF URL with standardized high-DPI full-height A4 vector viewer parameters
 */
export function getJudgeLikePdfViewerUrl(pdfUrl: string): string {
  if (!pdfUrl) return '';
  const cleanUrl = pdfUrl.split('#')[0];
  return cleanUrl + '#view=FitH&zoom=100&toolbar=1';
}

export interface UseJudicialSpeechDataOptions {
  sessionToken: string | null;
  selectedDeedId: string | null;
  previewOverrideUrl?: string | null;
}

export function useJudicialSpeechData({
  sessionToken,
  selectedDeedId,
  previewOverrideUrl,
}: UseJudicialSpeechDataOptions) {
  // Pending submissions list
  const listQuery = trpc.judge.listSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, staleTime: 20_000, refetchOnMount: false, refetchOnWindowFocus: false }
  );

  // Selected submission details
  const detailQuery = trpc.judge.getSubmission.useQuery(
    { sessionToken: sessionToken || '', id: selectedDeedId || '' },
    { enabled: !!sessionToken && !!selectedDeedId, staleTime: 20_000, refetchOnMount: false, refetchOnWindowFocus: false }
  );

  const activePdfUrl = useMemo(() => {
    return getJudicialSpeechDocument(detailQuery.data, previewOverrideUrl);
  }, [detailQuery.data, previewOverrideUrl]);

  const activeViewerUrl = useMemo(() => {
    return getJudgeLikePdfViewerUrl(activePdfUrl);
  }, [activePdfUrl]);

  return {
    submissions: listQuery.data ?? [],
    isListLoading: listQuery.isLoading,
    refetchList: listQuery.refetch,
    submissionData: detailQuery.data ?? null,
    isDetailLoading: detailQuery.isLoading,
    refetchDetail: detailQuery.refetch,
    activePdfUrl,
    activeViewerUrl,
  };
}
