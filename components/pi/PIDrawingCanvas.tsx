"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import type { PICallout as PICalloutData, PISheet } from "@/lib/pi/pi-types";
import { PICallout, calloutRadius } from "./PICallout";
import { PIControls } from "./PIControls";

export interface SheetCallout {
  item: string;
  callout: PICalloutData;
  /** Item resolves to an IBIS entity (shown in the hover title only). */
  mapped: boolean;
  label: string;
}

interface Transform {
  key: string;
  scale: number;
  x: number;
  y: number;
}

const MAX_SCALE = 6;
const FOCUS_ZOOM = 2.4;          // Selected callout is shown at this multiple of "fit".
const DRAG_THRESHOLD = 4;        // px before a press becomes a pan instead of a click.

/**
 * Zoomable, pannable sheet with selectable callout regions. The image is
 * loaded once per sheet; selection changes only move the overlay/transform.
 */
export function PIDrawingCanvas({
  sheet,
  imageUrl,
  callouts,
  selectedItem,
  onSelectItem,
}: {
  sheet: PISheet;
  imageUrl: string;
  callouts: SheetCallout[];
  selectedItem: string | null;
  onSelectItem: (item: string) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [resetToken, setResetToken] = useState(0);
  const [stored, setStored] = useState<Transform | null>(null);
  const [imageFailed, setImageFailed] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale = size.w && size.h ? Math.min(size.w / sheet.width, size.h / sheet.height) * 0.96 : 1;
  const fit = {
    scale: fitScale,
    x: (size.w - sheet.width * fitScale) / 2,
    y: (size.h - sheet.height * fitScale) / 2,
  };
  const focusCallouts = callouts.filter((c) => c.item === selectedItem).map((c) => c.callout);
  // Default view for the current sheet + selection: framing every callout of
  // the selected item on this sheet, or the whole sheet when it has none.
  const keyFor = (item: string | null) => `${sheet.id}|${item}|${resetToken}|${size.w > 0}`;
  const viewKey = keyFor(selectedItem);
  const focused = focusCallouts.length
    ? (() => {
        const xs = focusCallouts.map((c) => c.x);
        const ys = focusCallouts.map((c) => c.y);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const pad = 0.2 * Math.min(sheet.width, sheet.height);
        const boxScale = Math.min(size.w / (x1 - x0 + pad), size.h / (y1 - y0 + pad));
        const scale = Math.max(Math.min(fitScale * FOCUS_ZOOM, boxScale, MAX_SCALE), fitScale);
        return { scale, x: size.w / 2 - ((x0 + x1) / 2) * scale, y: size.h / 2 - ((y0 + y1) / 2) * scale };
      })()
    : fit;
  const t = stored && stored.key === viewKey ? stored : { key: viewKey, ...focused };
  const latest = useRef(t);
  useEffect(() => {
    latest.current = t;
  });

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const cur = latest.current;
    const scale = Math.min(Math.max(cur.scale * factor, fitScale * 0.5), MAX_SCALE);
    const k = scale / cur.scale;
    setStored({ key: viewKey, scale, x: cx - (cx - cur.x) * k, y: cy - (cy - cur.y) * k });
  };

  // Wheel zoom around the cursor (non-passive so the page does not scroll).
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const imageOk = imageFailed !== imageUrl;

  return (
    <div
      ref={viewport}
      className="relative h-full min-h-[420px] cursor-grab touch-none select-none overflow-hidden rounded border active:cursor-grabbing border-line bg-[#fbfcfd]"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: t.x, oy: t.y, moved: false };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        d.moved = true;
        setStored({ key: viewKey, scale: t.scale, x: d.ox + dx, y: d.oy + dy });
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved) {
          // A click (not a pan): hit-test callouts in sheet coordinates.
          const r = e.currentTarget.getBoundingClientRect();
          const sx = (e.clientX - r.left - t.x) / t.scale;
          const sy = (e.clientY - r.top - t.y) / t.scale;
          const hit = callouts.find((c) => Math.hypot(c.callout.x - sx, c.callout.y - sy) <= calloutRadius(c.callout) * 1.15);
          if (hit) {
            // Keep the current view for a direct click; only outside selection changes reframe.
            setStored({ ...t, key: keyFor(hit.item) });
            onSelectItem(hit.item);
          }
        }
      }}
    >
      {imageOk ? (
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{ width: sheet.width, height: sheet.height, transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local engineering sheet, transformed manually */}
          <img
            src={imageUrl}
            alt={`${sheet.label} drawing`}
            width={sheet.width}
            height={sheet.height}
            draggable={false}
            onError={() => setImageFailed(imageUrl)}
            className="pointer-events-none block max-w-none"
          />
          <svg className="absolute inset-0" width={sheet.width} height={sheet.height} viewBox={`0 0 ${sheet.width} ${sheet.height}`}>
            {callouts.map(({ item, callout, mapped, label }, i) => (
              <PICallout
                key={`${item}-${i}`}
                item={item}
                callout={callout}
                label={label}
                mapped={mapped}
                selected={item === selectedItem}
              />
            ))}
          </svg>
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-center text-sm text-ink-3">
          <div>
            <ImageOff size={22} className="mx-auto" aria-hidden />
            <p className="mt-2">{sheet.label} image not available in this environment.</p>
          </div>
        </div>
      )}

      <PIControls
        zoomPercent={Math.round((t.scale / fitScale) * 100)}
        onZoomIn={() => zoomAt(1.3, size.w / 2, size.h / 2)}
        onZoomOut={() => zoomAt(1 / 1.3, size.w / 2, size.h / 2)}
        onFit={() => setStored({ key: viewKey, ...fit })}
        onReset={() => {
          setStored(null);
          setResetToken((n) => n + 1);
        }}
      />
    </div>
  );
}
