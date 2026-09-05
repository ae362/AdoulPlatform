import React, { useMemo, useRef } from 'react';
import { Resizable } from 're-resizable';
import { clampPlacement, placementToScreenRect, screenRectToPlacement } from '../geometry';
import type { PageViewportBox, StampPlacement } from '../types';

type StampPlacementLayerProps = {
  page: number;
  pageBox: PageViewportBox;
  placement: StampPlacement;
  svgMarkup: string;
  onChange: (placement: StampPlacement) => void;
  allowRotation?: boolean;
};

export function StampPlacementLayer({
  page,
  pageBox,
  placement,
  svgMarkup,
  onChange,
  allowRotation = false,
}: StampPlacementLayerProps) {
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const clampedPlacement = useMemo(() => clampPlacement(placement, pageBox), [placement, pageBox]);
  const rect = useMemo(() => placementToScreenRect(clampedPlacement, pageBox), [clampedPlacement, pageBox]);

  const pushRect = (nextRect: typeof rect) => {
    onChange(clampPlacement(screenRectToPlacement(nextRect, page, pageBox), pageBox));
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const onMove = (moveEvent: PointerEvent) => {
      const hostRect = hostRef.current?.getBoundingClientRect();
      const dragOffset = dragOffsetRef.current;
      if (!hostRect || !dragOffset) return;
      pushRect({
        ...rect,
        left: moveEvent.clientX - hostRect.left - dragOffset.x,
        top: moveEvent.clientY - hostRect.top - dragOffset.y,
      });
    };

    const onUp = () => {
      dragOffsetRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-none">
      <Resizable
        size={{ width: rect.width, height: rect.height }}
        minWidth={120}
        minHeight={120}
        bounds="parent"
        lockAspectRatio
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          transform: `rotate(${allowRotation ? rect.rotation : 0}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'auto',
        }}
        handleStyles={{
          bottomRight: {
            width: 16,
            height: 16,
            right: -8,
            bottom: -8,
            borderRadius: 9999,
            background: '#f59e0b',
            border: '2px solid white',
          },
        }}
        enable={{
          top: false,
          right: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: true,
          bottomLeft: false,
          topLeft: false,
        }}
        onResizeStop={(_event, _direction, elementRef) => {
          pushRect({
            ...rect,
            width: elementRef.offsetWidth,
            height: elementRef.offsetHeight,
          });
        }}
      >
        <div
          data-stamp-selection-box="true"
          onPointerDown={handleDragStart}
          className="group relative h-full w-full cursor-grab touch-none select-none rounded-[28px] border-2 border-amber-500/90 bg-amber-100/15 shadow-[0_0_0_3px_rgba(251,191,36,0.18)] active:cursor-grabbing"
        >
          <div className="absolute inset-0 rounded-[28px] border border-amber-300/70" />
          <div
            className="absolute inset-0"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
            style={{ opacity: 0.22 }}
          />
          <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
            موضع الطابع
          </div>
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-amber-700 opacity-0 transition-opacity group-hover:opacity-100">
            اسحب للتحريك
          </div>
        </div>
      </Resizable>
    </div>
  );
}
