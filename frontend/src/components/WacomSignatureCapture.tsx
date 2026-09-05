import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export type CapturedWacomSignature = {
  signatureDataUrl: string;
  bioHash: string;
  signedAt: string;
  deviceInfo: {
    serial: string;
    firmware: string;
    resolution: string;
    pressureLevels: string;
  };
};

type Props = {
  signerLabel: string;
  onSave: (payload: CapturedWacomSignature) => Promise<void> | void;
  disabled?: boolean;
  existingSignatureDataUrl?: string | null;
  previewTargetRef?: React.RefObject<HTMLElement | null>;
};

type StuStatus = 'SEARCHING' | 'CONNECTING' | 'CONNECTED' | 'CAPTURING' | 'SAVED' | 'ERROR';

const trimSignatureCanvas = (canvas: HTMLCanvasElement): string | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const padding = 12;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
  const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

  const out = document.createElement('canvas');
  out.width = cropWidth;
  out.height = cropHeight;
  const outCtx = out.getContext('2d');
  if (!outCtx) return null;
  outCtx.clearRect(0, 0, cropWidth, cropHeight);
  outCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return out.toDataURL('image/png');
};

const sha256Hex = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const WacomSignatureCapture: React.FC<Props> = ({
  signerLabel,
  onSave,
  disabled = false,
  existingSignatureDataUrl = null,
  previewTargetRef,
}) => {
  const [stuStatus, setStuStatus] = useState<StuStatus>('SEARCHING');
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingPreviewToTablet, setIsSendingPreviewToTablet] = useState(false);
  const [savedPreviewUrl, setSavedPreviewUrl] = useState<string | null>(existingSignatureDataUrl);
  const [tabletSigningViewMode, setTabletSigningViewMode] = useState<'full' | 'signing-zone'>('full');
  const [tabletPreviewZoom, setTabletPreviewZoom] = useState(1.32);
  const [tabletPreviewScrollOffset, setTabletPreviewScrollOffset] = useState(0.5);
  const [deviceInfo, setDeviceInfo] = useState({
    serial: 'STU-540',
    firmware: '1.0',
    resolution: '800x480',
    pressureLevels: '1024',
  });

  const tabletRef = useRef<any>(null);
  const usbInterfaceRef = useRef<any>(null);
  const capabilityRef = useRef<any>(null);
  const reportHandlerRef = useRef<any>(null);
  const inkThresholdRef = useRef<any>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const connectingRef = useRef(false);
  const tabletPreviewZoomRef = useRef(1.32);
  const tabletPreviewScrollOffsetRef = useRef(0.5);
  const tabletSigningViewModeRef = useRef<'full' | 'signing-zone'>('full');
  const tabletButtonRegionsRef = useRef<Array<{ id: string; x: number; y: number; width: number; height: number }>>([]);
  const isCapturingRef = useRef(false);
  const hasInkRef = useRef(false);

  useEffect(() => {
    setSavedPreviewUrl(existingSignatureDataUrl);
  }, [existingSignatureDataUrl]);

  useEffect(() => {
    tabletPreviewZoomRef.current = tabletPreviewZoom;
  }, [tabletPreviewZoom]);

  useEffect(() => {
    tabletPreviewScrollOffsetRef.current = tabletPreviewScrollOffset;
  }, [tabletPreviewScrollOffset]);

  useEffect(() => {
    tabletSigningViewModeRef.current = tabletSigningViewMode;
    if (tabletSigningViewMode === 'signing-zone') {
      tabletPreviewScrollOffsetRef.current = 1;
      setTabletPreviewScrollOffset(1);
    }
  }, [tabletSigningViewMode]);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
  };

  const clampTabletScrollOffset = (value: number) => Math.max(0, Math.min(1, value));

  const clearTabletScreen = async (tablet: any) => {
    if (!tablet) return;
    if (typeof tablet.clearScreen === 'function') {
      await tablet.clearScreen();
      return;
    }
    if (typeof tablet.setClearScreen === 'function') {
      await tablet.setClearScreen();
    }
  };

  const waitForService = (wgss: any, retries: number, delayMs = 350): Promise<boolean> =>
    new Promise((resolve) => {
      let count = 0;
      const check = () => {
        if (wgss && wgss.STU && wgss.STU.isServiceReady()) {
          resolve(true);
        } else if (count < retries) {
          count += 1;
          setTimeout(check, delayMs);
        } else {
          resolve(false);
        }
      };
      check();
    });

  const disconnectTablet = async () => {
    const wgss = (window as any).WacomGSS;
    const protocol = wgss?.STU ? new wgss.STU.Protocol() : null;
    try {
      if (reportHandlerRef.current?.stopReporting) {
        await reportHandlerRef.current.stopReporting();
      }
    } catch {
      // ignore
    } finally {
      reportHandlerRef.current = null;
    }

    try {
      if (tabletRef.current && protocol?.InkingMode) {
        await tabletRef.current.setInkingMode(protocol.InkingMode.InkingMode_Off);
      }
    } catch {
      // ignore
    }

    try {
      if (tabletRef.current?.disconnect) {
        await tabletRef.current.disconnect();
      }
    } catch {
      // ignore
    }

    try {
      if (usbInterfaceRef.current?.disconnect) {
        await usbInterfaceRef.current.disconnect();
      }
    } catch {
      // ignore
    }

    tabletRef.current = null;
    usbInterfaceRef.current = null;
    setIsConnected(false);
    setIsCapturing(false);
    setStuStatus('SEARCHING');
  };

  useEffect(() => {
    return () => {
      disconnectTablet().catch(() => undefined);
    };
  }, []);

  const connectToTablet = async () => {
    if (connectingRef.current || disabled) return;
    connectingRef.current = true;
    const wgss = (window as any).WacomGSS;

    try {
      setHardwareError(null);
      setStuStatus('CONNECTING');

      if (!wgss || !wgss.STUConstructor) {
        throw new Error('Wacom GSS SDK غير محمل بعد');
      }

      await disconnectTablet();

      if (wgss.STU) {
        try {
          wgss.STU.close();
        } catch {
          // ignore
        }
        wgss.STU = null;
      }

      wgss.STU = new wgss.STUConstructor(9000, 'localhost');
      const isReady = await waitForService(wgss, 3, 250);
      if (!isReady) {
        throw new Error('تعذر الوصول إلى خدمة SigCaptX على المنفذ 9000');
      }

      const devices = await wgss.STU.getUsbDevices();
      if (!Array.isArray(devices) || devices.length === 0) {
        throw new Error('لم يتم العثور على جهاز STU-540');
      }

      const device = devices.find((item: any) => String(item?.model || item?.name || '').includes('540')) || devices[0];
      const intf = new wgss.STU.UsbInterface();
      await intf.Constructor();
      await intf.connect(device, true);
      usbInterfaceRef.current = intf;

      const tablet = new wgss.STU.Tablet();
      await tablet.Constructor(intf, null, null);
      tabletRef.current = tablet;

      const info = await tablet.getInformation().catch(() => ({}));
      const capability = await tablet.getCapability().catch(() => ({}));
      const inkThreshold = await tablet.getInkThreshold().catch(() => null);
      capabilityRef.current = capability;
      inkThresholdRef.current = inkThreshold;

      setDeviceInfo({
        serial: info?.serialNumber || 'STU-540',
        firmware: info?.firmwareMajor ? `${info.firmwareMajor}.${info.firmwareMinor}` : '1.0',
        resolution:
          capability?.screenWidth && capability?.screenHeight
            ? `${capability.screenWidth}x${capability.screenHeight}`
            : '800x480',
        pressureLevels: String(capability?.maxPressure || 1024),
      });

      const protocol = new wgss.STU.Protocol();
      await tablet.setPenDataOptionMode(protocol.PenDataOptionMode.PenDataOptionMode_TimeCountSequence).catch(() => undefined);
      await clearTabletScreen(tablet).catch(() => undefined);
      await tablet.setInkingMode(protocol.InkingMode.InkingMode_On);

      setIsConnected(true);
      setStuStatus('CONNECTED');
    } catch (error: any) {
      setStuStatus('ERROR');
      setHardwareError(error?.message || 'فشل الاتصال بجهاز Wacom');
    } finally {
      connectingRef.current = false;
    }
  };

  const startCapture = async () => {
    clearSignatureCanvas();
    setSavedPreviewUrl(null);
    setStuStatus('CAPTURING');
    setIsCapturing(true);
    await refreshTabletPreview();
  };

  const refreshTabletPreview = async () => {
    try {
      setIsSendingPreviewToTablet(true);
      setHardwareError(null);
      await pushPreviewToTablet(tabletSigningViewModeRef.current);
      await startTabletNavigationMode();
      setStuStatus('CONNECTED');
    } catch (err: any) {
      setHardwareError(err?.message || 'تعذر تحديث معاينة الوثيقة على شاشة اللوحة.');
      setStuStatus('ERROR');
    } finally {
      setIsSendingPreviewToTablet(false);
    }
  };

  const drawTabletControlButton = (
    ctx: CanvasRenderingContext2D,
    region: { id: string; x: number; y: number; width: number; height: number },
    label: string,
    fill: string,
    border: string,
    text: string
  ) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(region.x, region.y, region.width, region.height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, region.x + region.width / 2, region.y + region.height / 2);
  };

  const drawTabletControlsOverlay = (ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number) => {
    const topBarHeight = 68;
    const bottomBarHeight = 56;
    const margin = 12;
    const gap = 8;
    const buttonWidth = Math.floor((screenWidth - (margin * 2) - (gap * 4)) / 5);
    const buttonHeight = 40;
    const topY = 14;
    const bottomY = screenHeight - bottomBarHeight + 8;

    ctx.fillStyle = 'rgba(15,23,42,0.92)';
    ctx.fillRect(0, 0, screenWidth, topBarHeight);
    ctx.fillRect(0, screenHeight - bottomBarHeight, screenWidth, bottomBarHeight);

    const regions = [
      { id: 'zoom-out', label: '−', fill: '#fef3c7', border: '#f59e0b', text: '#b45309' },
      { id: 'zoom-in', label: '+', fill: '#fef3c7', border: '#f59e0b', text: '#b45309' },
      { id: 'scroll-up', label: '↑', fill: '#dcfce7', border: '#4ade80', text: '#166534' },
      { id: 'scroll-down', label: '↓', fill: '#dcfce7', border: '#4ade80', text: '#166534' },
      {
        id: 'mode',
        label: tabletSigningViewModeRef.current === 'full' ? 'منطقة' : 'صفحة',
        fill: '#f3e8ff',
        border: '#a855f7',
        text: '#7c3aed',
      },
    ].map((item, index) => ({
      ...item,
      x: margin + index * (buttonWidth + gap),
      y: topY,
      width: buttonWidth,
      height: buttonHeight,
    }));

    regions.forEach((region) => {
      drawTabletControlButton(ctx, region, region.label, region.fill, region.border, region.text);
    });

    const signRegion = { id: 'sign', x: margin, y: bottomY, width: screenWidth - margin * 2, height: 40 };
    drawTabletControlButton(ctx, signRegion, `حفظ ${signerLabel}`, '#dcfce7', '#22c55e', '#065f46');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      `${tabletSigningViewModeRef.current === 'full' ? 'صفحة كاملة' : 'منطقة التوقيع'} | ${Math.round(tabletPreviewZoomRef.current * 100)}%`,
      screenWidth - 16,
      screenHeight - 18
    );

    tabletButtonRegionsRef.current = [...regions, signRegion];
  };

  const renderTabletPreviewImage = async (mode: 'full' | 'signing-zone') => {
    const target = previewTargetRef?.current;
    if (!target) {
      throw new Error('تعذر العثور على معاينة الوثيقة الحالية لإرسالها إلى شاشة اللوحة.');
    }

    const screenWidth = Number(capabilityRef.current?.screenWidth || 800);
    const screenHeight = Number(capabilityRef.current?.screenHeight || 480);
    const screenAspect = screenWidth / Math.max(1, screenHeight);

    const snapshot = await html2canvas(target, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = screenWidth;
    targetCanvas.height = screenHeight;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) {
      throw new Error('Target canvas unavailable');
    }

    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(0, 0, screenWidth, screenHeight);

    const drawY = 68;
    const drawHeight = screenHeight - 124;

    if (mode === 'signing-zone') {
      const zoneCropWidth = snapshot.width;
      const zoneCropHeight = Math.min(snapshot.height, Math.round(zoneCropWidth / screenAspect));
      const bottomPadding = Math.round(snapshot.height * 0.02);
      const srcY = Math.max(0, snapshot.height - zoneCropHeight - bottomPadding);
      targetCtx.drawImage(snapshot, 0, srcY, zoneCropWidth, zoneCropHeight, 0, drawY, screenWidth, drawHeight);
    } else {
      const baseCropWidth = snapshot.width;
      const baseCropHeight = Math.min(snapshot.height, Math.round(baseCropWidth / screenAspect));
      const cropWidth = Math.max(1, Math.round(baseCropWidth / tabletPreviewZoomRef.current));
      const cropHeight = Math.max(1, Math.round(baseCropHeight / tabletPreviewZoomRef.current));
      const cropX = Math.max(0, Math.round((snapshot.width - cropWidth) / 2));
      const availableScroll = Math.max(0, snapshot.height - cropHeight);
      const cropY = Math.max(0, Math.round(availableScroll * tabletPreviewScrollOffsetRef.current));
      targetCtx.drawImage(snapshot, cropX, cropY, cropWidth, cropHeight, 0, drawY, screenWidth, drawHeight);
    }

    drawTabletControlsOverlay(targetCtx, screenWidth, screenHeight);
    return targetCanvas.toDataURL('image/png');
  };

  const pushPreviewToTablet = async (mode: 'full' | 'signing-zone') => {
    if (!tabletRef.current) {
      await connectToTablet();
      if (!tabletRef.current) return;
    }

    const wgss = (window as any).WacomGSS;
    const tablet = tabletRef.current;
    const caps = capabilityRef.current;
    const screenWidth = Number(caps?.screenWidth || 800);
    const screenHeight = Number(caps?.screenHeight || 480);
    const protocol = new wgss.STU.Protocol();
    const b64Data = await renderTabletPreviewImage(mode);
    await clearTabletScreen(tablet);
    await tablet.setInkingMode(protocol.InkingMode.InkingMode_Off);

    const encodingCandidates = [
      protocol.EncodingMode.EncodingMode_24bit,
      protocol.EncodingMode.EncodingMode_16bit,
      protocol.EncodingMode.EncodingMode_1bit,
    ];

    let lastError: unknown = null;
    for (const encodingMode of encodingCandidates) {
      try {
        const flattened = await wgss.STU.ProtocolHelper.resizeAndFlatten(
          b64Data,
          0,
          0,
          0,
          0,
          screenWidth,
          screenHeight,
          encodingMode,
          1,
          false,
          0,
          true
        );
        await tablet.writeImage(encodingMode, flattened);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('تعذر إرسال صورة الوثيقة إلى شاشة STU-540.');
  };

  const handleTabletVirtualButtonTap = async (buttonId: string) => {
    if (buttonId === 'sign') {
      if (!hasInkRef.current) {
        setHardwareError('وقّع أولاً فوق الوثيقة على شاشة Wacom ثم اضغط زر الحفظ الأخضر.');
        return;
      }
      await saveCapture();
      return;
    }

    if (buttonId === 'zoom-out') {
      const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoomRef.current - 0.12).toFixed(2))));
      tabletPreviewZoomRef.current = nextZoom;
      setTabletPreviewZoom(nextZoom);
    } else if (buttonId === 'zoom-in') {
      const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoomRef.current + 0.12).toFixed(2))));
      tabletPreviewZoomRef.current = nextZoom;
      setTabletPreviewZoom(nextZoom);
    } else if (buttonId === 'scroll-up') {
      const nextOffset = clampTabletScrollOffset(tabletPreviewScrollOffsetRef.current - 0.12);
      tabletPreviewScrollOffsetRef.current = nextOffset;
      setTabletPreviewScrollOffset(nextOffset);
    } else if (buttonId === 'scroll-down') {
      const nextOffset = clampTabletScrollOffset(tabletPreviewScrollOffsetRef.current + 0.12);
      tabletPreviewScrollOffsetRef.current = nextOffset;
      setTabletPreviewScrollOffset(nextOffset);
    } else if (buttonId === 'mode') {
      const nextMode = tabletSigningViewModeRef.current === 'full' ? 'signing-zone' : 'full';
      tabletSigningViewModeRef.current = nextMode;
      setTabletSigningViewMode(nextMode);
      if (nextMode === 'signing-zone') {
        tabletPreviewScrollOffsetRef.current = 1;
        setTabletPreviewScrollOffset(1);
      } else {
        tabletPreviewScrollOffsetRef.current = 0.5;
        setTabletPreviewScrollOffset(0.5);
      }
    }

    await refreshTabletPreview();
  };

  const startTabletNavigationMode = async () => {
    if (!tabletRef.current) return;

    const wgss = (window as any).WacomGSS;
    const tablet = tabletRef.current;
    const caps = capabilityRef.current;
    const protocol = wgss?.STU ? new wgss.STU.Protocol() : null;

    try {
      if (reportHandlerRef.current?.stopReporting) {
        await reportHandlerRef.current.stopReporting().catch(() => undefined);
      }

      try {
        if (tablet && protocol?.InkingMode) {
          await tablet.setInkingMode(protocol.InkingMode.InkingMode_On);
        }
      } catch {
        // ignore
      }

      const reportHandler = new wgss.STU.ProtocolHelper.ReportHandler();
      reportHandlerRef.current = reportHandler;
      let downPoint: { x: number; y: number } | null = null;
      let isDown = false;
      let tapLocked = false;
      let activeButtonId: string | null = null;
      let lastInkPoint: { x: number; y: number } | null = null;

      const handleReport = async (report: any) => {
        if (tapLocked) return;

        const tabletMaxX = Number(caps?.tabletMaxX || 10800);
        const tabletMaxY = Number(caps?.tabletMaxY || 6480);
        const threshold = inkThresholdRef.current;
        const onMark = Number(threshold?.onPressureMark ?? (caps?.minPressure || 100));
        const offMark = Number(threshold?.offPressureMark ?? Math.max(0, onMark - 1));
        const pressure = Number(report?.pressure ?? 0);
        const nextIsDown = isDown ? !(pressure <= offMark) : pressure > onMark;
        const point = {
          x: (Number(report?.x || 0) / Math.max(1, tabletMaxX)) * Number(caps?.screenWidth || 800),
          y: (Number(report?.y || 0) / Math.max(1, tabletMaxY)) * Number(caps?.screenHeight || 480),
        };

        const canvas = sigCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        const inkPoint =
          canvas
            ? {
                x: Math.round((canvas.width * Number(report?.x || 0)) / Math.max(1, tabletMaxX)),
                y: Math.round((canvas.height * Number(report?.y || 0)) / Math.max(1, tabletMaxY)),
              }
            : null;

        if (!isDown && nextIsDown) {
          downPoint = point;
          activeButtonId =
            tabletButtonRegionsRef.current.find(
              (region) =>
                point.x >= region.x &&
                point.x <= region.x + region.width &&
                point.y >= region.y &&
                point.y <= region.y + region.height
            )?.id || null;
          if (!activeButtonId && inkPoint) {
            lastInkPoint = inkPoint;
          }
        } else if (isDown && !nextIsDown && downPoint) {
          const moved = Math.hypot(point.x - downPoint.x, point.y - downPoint.y);
          if (activeButtonId && moved <= 18) {
            const hit = tabletButtonRegionsRef.current.find((region) => region.id === activeButtonId);
            if (hit) {
              tapLocked = true;
              try {
                await handleTabletVirtualButtonTap(hit.id);
              } finally {
                setTimeout(() => {
                  tapLocked = false;
                }, 180);
              }
            }
          }
          downPoint = null;
          activeButtonId = null;
          lastInkPoint = null;
        } else if (nextIsDown && !activeButtonId && inkPoint && ctx && lastInkPoint) {
          ctx.beginPath();
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#111827';
          ctx.moveTo(lastInkPoint.x, lastInkPoint.y);
          ctx.lineTo(inkPoint.x, inkPoint.y);
          ctx.stroke();
          ctx.closePath();
          lastInkPoint = inkPoint;
          hasInkRef.current = true;
          setIsCapturing(true);
          setStuStatus('CAPTURING');
        }

        isDown = nextIsDown;
      };

      reportHandler.onReportPenData = (report: any) => { void handleReport(report); };
      reportHandler.onReportPenDataOption = (report: any) => { void handleReport(report); };
      reportHandler.onReportPenDataTimeCountSequence = (report: any) => { void handleReport(report); };

      await reportHandler.startReporting(tablet, true);
    } catch {
      setHardwareError('تعذر تفعيل وضع التنقل على شاشة STU-540.');
      setStuStatus('ERROR');
    }
  };

  const handleShowDocumentOnTablet = async () => {
    await refreshTabletPreview();
  };

  const saveCapture = async () => {
    const trimmed = sigCanvasRef.current ? trimSignatureCanvas(sigCanvasRef.current) : null;
    if (!trimmed) {
      setHardwareError('يرجى التقاط توقيع صالح أولاً');
      return;
    }

    setIsSaving(true);
    setHardwareError(null);
    try {
      const bioHash = await sha256Hex(trimmed);
      const payload: CapturedWacomSignature = {
        signatureDataUrl: trimmed,
        bioHash,
        signedAt: new Date().toISOString(),
        deviceInfo,
      };
      await onSave(payload);
      setSavedPreviewUrl(trimmed);
      setStuStatus('SAVED');
      setIsCapturing(false);
      hasInkRef.current = false;
      if (reportHandlerRef.current?.stopReporting) {
        await reportHandlerRef.current.stopReporting().catch(() => undefined);
      }
      reportHandlerRef.current = null;
      await clearTabletScreen(tabletRef.current).catch(() => undefined);
    } catch (error: any) {
      setStuStatus('ERROR');
      setHardwareError(error?.message || 'فشل حفظ التوقيع');
    } finally {
      setIsSaving(false);
    }
  };

  const statusColor =
    stuStatus === 'CONNECTED'
      ? 'text-blue-700 bg-blue-50 border-blue-200'
      : stuStatus === 'CAPTURING'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : stuStatus === 'SAVED'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : stuStatus === 'ERROR'
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-slate-600 bg-slate-50 border-slate-200';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-base font-black text-slate-900">{signerLabel}</h4>
          <p className="text-xs font-bold text-slate-500">Wacom STU-540 / SigCaptX</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusColor}`}>{stuStatus}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <canvas
              ref={sigCanvasRef}
              width={800}
              height={480}
              className="h-[220px] w-full bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTabletSigningViewMode('full')}
              className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                tabletSigningViewMode === 'full'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              عرض الصفحة الحالية
            </button>
            <button
              type="button"
              onClick={() => setTabletSigningViewMode('signing-zone')}
              className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                tabletSigningViewMode === 'signing-zone'
                  ? 'border-red-700 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              عرض منطقة التوقيع
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoomRef.current - 0.12).toFixed(2))));
                tabletPreviewZoomRef.current = nextZoom;
                setTabletPreviewZoom(nextZoom);
              }}
              disabled={isSendingPreviewToTablet}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              تصغير على اللوحة
            </button>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-center text-[11px] font-black text-slate-700">
              {Math.round(tabletPreviewZoom * 100)}%
            </div>
            <button
              type="button"
              onClick={() => {
                const nextZoom = Math.max(0.5, Math.min(2.2, Number((tabletPreviewZoomRef.current + 0.12).toFixed(2))));
                tabletPreviewZoomRef.current = nextZoom;
                setTabletPreviewZoom(nextZoom);
              }}
              disabled={isSendingPreviewToTablet}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              تكبير على اللوحة
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const nextOffset = clampTabletScrollOffset(tabletPreviewScrollOffsetRef.current - 0.12);
                tabletPreviewScrollOffsetRef.current = nextOffset;
                setTabletPreviewScrollOffset(nextOffset);
              }}
              disabled={isSendingPreviewToTablet}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              رفع المعاينة
            </button>
            <button
              type="button"
              onClick={() => {
                const nextOffset = clampTabletScrollOffset(tabletPreviewScrollOffsetRef.current + 0.12);
                tabletPreviewScrollOffsetRef.current = nextOffset;
                setTabletPreviewScrollOffset(nextOffset);
              }}
              disabled={isSendingPreviewToTablet}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              خفض المعاينة
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={connectToTablet}
              disabled={disabled || isConnected || stuStatus === 'CONNECTING'}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnected ? 'متصل' : 'ربط الجهاز'}
            </button>
            <button
              type="button"
              onClick={() => void handleShowDocumentOnTablet()}
              disabled={disabled || isSendingPreviewToTablet || !previewTargetRef?.current}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSendingPreviewToTablet ? 'جارٍ العرض...' : 'عرض الوثيقة'}
            </button>
            <button
              type="button"
              onClick={() => void refreshTabletPreview()}
              disabled={disabled || isSendingPreviewToTablet || !isConnected || !previewTargetRef?.current}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تحديث العرض
            </button>
            <button
              type="button"
              onClick={async () => {
                clearSignatureCanvas();
                setSavedPreviewUrl(null);
                setIsCapturing(true);
                setStuStatus('CAPTURING');
                await refreshTabletPreview();
              }}
              disabled={disabled || !isConnected}
              className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تهيئة التوقيع
            </button>
            <button
              type="button"
              onClick={() => {
                clearSignatureCanvas();
                setSavedPreviewUrl(null);
                setStuStatus(isConnected ? 'CONNECTED' : 'SEARCHING');
              }}
              disabled={disabled}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={saveCapture}
              disabled={disabled || isSaving}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التوقيع'}
            </button>
            <button
              type="button"
              onClick={() => disconnectTablet()}
              disabled={disabled || !isConnected}
              className="rounded-2xl border border-rose-300 px-4 py-2 text-xs font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              فصل الجهاز
            </button>
          </div>
          {hardwareError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {hardwareError}
            </div>
          )}
          {previewTargetRef?.current && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-800">
              استخدم `عرض الوثيقة` لإرسال نفس الصفحة الظاهرة أمامك إلى شاشة STU-540، ثم ابدأ التوقيع من اللوحة أو من زر `بدء التوقيع`.
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 text-[11px] font-bold text-slate-600">
            <div className="flex items-center justify-between">
              <span>Serial</span>
              <span className="font-mono text-slate-900">{deviceInfo.serial}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Firmware</span>
              <span className="font-mono text-slate-900">{deviceInfo.firmware}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Resolution</span>
              <span className="font-mono text-slate-900">{deviceInfo.resolution}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pressure</span>
              <span className="font-mono text-slate-900">{deviceInfo.pressureLevels}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <p className="mb-2 text-[10px] font-black text-slate-500">المعاينة المحفوظة</p>
            {savedPreviewUrl ? (
              <img src={savedPreviewUrl} alt={signerLabel} className="h-28 w-full object-contain" />
            ) : (
              <div className="flex h-28 items-center justify-center text-xs font-bold text-slate-400">
                لا يوجد توقيع محفوظ بعد
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WacomSignatureCapture;
