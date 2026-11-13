"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  function close() { setOpen(false); setScale(1); setOffset({ x: 0, y: 0 }); drag.current = null; }
  function zoom(next: number) { const s = Math.max(1, Math.min(8, next)); setScale(s); if (s === 1) setOffset({ x: 0, y: 0 }); }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="block max-w-full text-left" title="Zoom image">
      <img src={src} alt={alt} loading="lazy" className="max-h-64 max-w-full rounded-lg object-contain" />
      <span className="mt-1 block break-all text-xs underline">{alt} · Click to zoom</span>
    </button>
    {open && <div role="dialog" aria-modal="true" aria-label={`Image preview: ${alt}`} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90" onClick={close}>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={() => zoom(scale - 0.5)} className="rounded bg-neutral-800 px-3 py-2 text-white" aria-label="Zoom out">−</button>
        <span className="text-sm text-white">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => zoom(scale + 0.5)} className="rounded bg-neutral-800 px-3 py-2 text-white" aria-label="Zoom in">+</button>
        <button type="button" onClick={() => { zoom(1); }} className="rounded bg-neutral-800 px-3 py-2 text-white">Reset</button>
        <button type="button" onClick={close} className="rounded bg-red-700 px-3 py-2 text-white">Close ✕</button>
      </div>
      <div className="flex h-full w-full items-center justify-center overflow-hidden p-12" onClick={e => e.stopPropagation()}
        onWheel={e => { e.preventDefault(); zoom(scale + (e.deltaY < 0 ? 0.25 : -0.25)); }}
        onPointerDown={e => { if (scale <= 1) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; }}
        onPointerMove={e => { if (!drag.current) return; setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
        style={{ cursor: scale > 1 ? "grab" : "default", touchAction: "none" }}>
        <img src={src} alt={alt} draggable={false} className="max-h-full max-w-full select-none object-contain" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center" }} />
      </div>
    </div>}
  </>;
}
