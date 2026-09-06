import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '../../../trpc';

export type ActiveDocVersion = 'base' | 'edited';
export type OnlyOfficePaneStatus = 'idle' | 'loading-config' | 'loading-editor' | 'ready' | 'error';

export interface UseOnlyOfficeIntegrationProps {
  sessionToken: string | null;
  rasmId: string | null;
  rasmQuery: any;
  primaryBusy: boolean;
  isEmbeddedOnlyOfficePreviewTab: boolean;
  activeDocVersion: ActiveDocVersion;
}

export const useOnlyOfficeIntegration = ({
  sessionToken,
  rasmId,
  rasmQuery,
  primaryBusy,
  isEmbeddedOnlyOfficePreviewTab,
  activeDocVersion,
}: UseOnlyOfficeIntegrationProps) => {
  const onlyOfficeBaselineRef = useRef<{ versionId: string | null; updatedAt: string | null }>({
    versionId: null,
    updatedAt: null,
  });

  const [onlyOfficeOpen, setOnlyOfficeOpen] = useState(false);
  const [onlyOfficeDsUrl, setOnlyOfficeDsUrl] = useState<string | null>(null);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState<Record<string, unknown> | null>(null);

  const getOnlyOfficeConfigMutation = (trpc as any).feesAgent.documents.getOnlyOfficeConfig.useMutation();
  const forceOnlyOfficeSaveMutation = (trpc as any).feesAgent.documents.forceOnlyOfficeSave.useMutation();

  const [onlyOfficeMode, setOnlyOfficeMode] = useState<'overlay' | 'embedded'>('overlay');
  const [onlyOfficePaneStatus, setOnlyOfficePaneStatus] = useState<OnlyOfficePaneStatus>('idle');
  const [onlyOfficeError, setOnlyOfficeError] = useState<string | null>(null);
  const [onlyOfficeLoadStartedAt, setOnlyOfficeLoadStartedAt] = useState<number | null>(null);
  const [onlyOfficeRenderNonce, setOnlyOfficeRenderNonce] = useState(0);

  const onlyOfficeAutoLoadKeyRef = useRef<string | null>(null);
  const onlyOfficeRequestSeqRef = useRef(0);
  const onlyOfficeEmbeddedRetryRef = useRef(0);

  const isEmbeddedOnlyOfficeActive =
    isEmbeddedOnlyOfficePreviewTab && activeDocVersion === 'base';
  const shouldRenderOnlyOfficePrimaryPane = isEmbeddedOnlyOfficeActive;
  const shouldMountEmbeddedOnlyOffice =
    isEmbeddedOnlyOfficeActive &&
    !!onlyOfficeDsUrl &&
    !!onlyOfficeConfig &&
    onlyOfficePaneStatus !== 'error';
  const shouldShowEmbeddedOnlyOfficeLoader =
    shouldRenderOnlyOfficePrimaryPane &&
    !shouldMountEmbeddedOnlyOffice &&
    onlyOfficePaneStatus !== 'error';

  const loadOnlyOfficeConfig = useCallback(
    async (options?: { mode?: 'overlay' | 'embedded'; silent?: boolean; force?: boolean }) => {
      const mode = options?.mode || 'overlay';
      const silent = options?.silent ?? false;
      const force = options?.force ?? false;

      if (!sessionToken || !rasmId) {
        if (!silent) {
          alert('بيانات الاعتماد غير مكتملة لتحميل محرر OnlyOffice.');
        }
        return false;
      }

      if (primaryBusy && !force) {
        if (!silent) {
          alert('يرجى الانتظار حتى اكتمال العملية الحالية.');
        }
        return false;
      }

      const requestSeq = ++onlyOfficeRequestSeqRef.current;

      setOnlyOfficeMode(mode);
      setOnlyOfficeError(null);

      if (mode === 'embedded') {
        setOnlyOfficeOpen(false);
        setOnlyOfficePaneStatus('loading-config');
        setOnlyOfficeLoadStartedAt((prev) => prev ?? Date.now());
      } else {
        setOnlyOfficePaneStatus('ready');
        setOnlyOfficeLoadStartedAt(null);
      }

      if (force) {
        setOnlyOfficeDsUrl(null);
        setOnlyOfficeConfig(null);
        setOnlyOfficeRenderNonce((n) => n + 1);
      }

      try {
        onlyOfficeBaselineRef.current = {
          versionId:
            (rasmQuery.data?.payload as any)?.latestDocxVersionId ||
            (rasmQuery.data?.payload as any)?.latestEditedDocxVersionId ||
            null,
          updatedAt:
            (rasmQuery.data?.payload as any)?.latestDraftUpdatedAt ||
            (rasmQuery.data?.payload as any)?.latestSavedDocsPointerUpdatedAt ||
            null,
        };

        const res = await getOnlyOfficeConfigMutation.mutateAsync({
          sessionToken,
          id: rasmId,
          editorType: 'desktop',
        });

        if (requestSeq !== onlyOfficeRequestSeqRef.current) return false;

        const nextDsUrl = (res?.documentServerUrl || res?.dsUrl || null) as string | null;
        const nextConfig = (res?.config || null) as Record<string, unknown> | null;

        if (!nextDsUrl || !nextConfig) {
          throw new Error('OnlyOffice config response is incomplete');
        }

        setOnlyOfficeDsUrl(nextDsUrl);
        setOnlyOfficeConfig(nextConfig);
        setOnlyOfficeRenderNonce((n) => n + 1);

        if (mode === 'embedded') {
          setOnlyOfficePaneStatus('loading-editor');
        } else {
          setOnlyOfficeOpen(true);
        }
        return true;
      } catch (err: any) {
        if (requestSeq !== onlyOfficeRequestSeqRef.current) return false;

        const message = err?.message || 'تعذر تحميل إعدادات محرر OnlyOffice.';
        setOnlyOfficeError(message);
        setOnlyOfficeDsUrl(null);
        setOnlyOfficeConfig(null);
        setOnlyOfficeOpen(false);
        setOnlyOfficeLoadStartedAt(null);
        setOnlyOfficePaneStatus(mode === 'embedded' ? 'error' : 'idle');

        if (!silent) {
          alert(`فشل فتح محرر OnlyOffice: ${message}`);
        }
        return false;
      }
    },
    [getOnlyOfficeConfigMutation, primaryBusy, rasmId, rasmQuery.data, sessionToken]
  );

  const reloadEmbeddedOnlyOfficeToLatestVersion = useCallback(() => {
    if (!isEmbeddedOnlyOfficeActive) return;
    if (onlyOfficeMode !== 'embedded') return;

    void loadOnlyOfficeConfig({ mode: 'embedded', silent: true, force: true });
  }, [isEmbeddedOnlyOfficeActive, loadOnlyOfficeConfig, onlyOfficeMode]);

  const refreshAfterOnlyOfficeSave = useCallback((opts?: {
    expectedVersionId?: string | null;
    maxAttempts?: number;
    intervalMs?: number;
    baselineOverride?: { versionId: string | null; updatedAt: string | null };
  }) => {
    const baseline = opts?.baselineOverride || onlyOfficeBaselineRef.current;
    const maxAttempts = opts?.maxAttempts ?? 10;
    const intervalMs = opts?.intervalMs ?? 1000;

    return (async () => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const fresh = await rasmQuery.refetch();
          const freshPayload = fresh.data?.payload as any;
          const freshVersionId =
            freshPayload?.latestDocxVersionId ||
            freshPayload?.latestEditedDocxVersionId ||
            null;
          const freshUpdatedAt =
            freshPayload?.latestDraftUpdatedAt ||
            freshPayload?.latestSavedDocsPointerUpdatedAt ||
            null;

          const versionChanged =
            opts?.expectedVersionId
              ? freshVersionId === opts.expectedVersionId
              : (freshVersionId && freshVersionId !== baseline.versionId) ||
                (freshUpdatedAt && freshUpdatedAt !== baseline.updatedAt);

          if (versionChanged) {
            onlyOfficeBaselineRef.current = {
              versionId: freshVersionId,
              updatedAt: freshUpdatedAt,
            };
            return true;
          }
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      reloadEmbeddedOnlyOfficeToLatestVersion();
      return false;
    })();
  }, [rasmQuery, reloadEmbeddedOnlyOfficeToLatestVersion]);

  // Auto-mount effect
  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive || !sessionToken || !rasmId) return;

    const autoKey = `${rasmId}:${activeDocVersion}:${(rasmQuery.data?.payload as any)?.latestDocxVersionId || ''}:${(rasmQuery.data?.payload as any)?.latestDraftUpdatedAt || ''}`;

    const isAlreadyLoaded =
      onlyOfficeMode === 'embedded' &&
      onlyOfficeDsUrl &&
      onlyOfficeConfig &&
      onlyOfficePaneStatus !== 'error';

    if (isAlreadyLoaded) {
      onlyOfficeAutoLoadKeyRef.current = autoKey;
      return;
    }

    if (
      onlyOfficeAutoLoadKeyRef.current === autoKey ||
      onlyOfficeAutoLoadKeyRef.current === `loading:${autoKey}`
    ) {
      return;
    }

    let isMounted = true;
    onlyOfficeAutoLoadKeyRef.current = `loading:${autoKey}`;

    void loadOnlyOfficeConfig({ mode: 'embedded', silent: true }).then((loaded) => {
      if (!isMounted) return;
      if (loaded) {
        onlyOfficeAutoLoadKeyRef.current = autoKey;
      } else if (onlyOfficeAutoLoadKeyRef.current === `loading:${autoKey}`) {
        onlyOfficeAutoLoadKeyRef.current = null;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    activeDocVersion,
    isEmbeddedOnlyOfficeActive,
    loadOnlyOfficeConfig,
    onlyOfficeConfig,
    onlyOfficeDsUrl,
    onlyOfficeMode,
    onlyOfficePaneStatus,
    rasmId,
    rasmQuery.data,
    sessionToken,
  ]);

  return {
    onlyOfficeBaselineRef,
    onlyOfficeOpen,
    setOnlyOfficeOpen,
    onlyOfficeDsUrl,
    setOnlyOfficeDsUrl,
    onlyOfficeConfig,
    setOnlyOfficeConfig,
    onlyOfficeMode,
    setOnlyOfficeMode,
    onlyOfficePaneStatus,
    setOnlyOfficePaneStatus,
    onlyOfficeError,
    setOnlyOfficeError,
    onlyOfficeLoadStartedAt,
    setOnlyOfficeLoadStartedAt,
    onlyOfficeRenderNonce,
    setOnlyOfficeRenderNonce,
    isEmbeddedOnlyOfficeActive,
    shouldRenderOnlyOfficePrimaryPane,
    shouldMountEmbeddedOnlyOffice,
    shouldShowEmbeddedOnlyOfficeLoader,
    loadOnlyOfficeConfig,
    reloadEmbeddedOnlyOfficeToLatestVersion,
    refreshAfterOnlyOfficeSave,
    forceOnlyOfficeSaveMutation,
    getOnlyOfficeConfigMutation,
  };
};
