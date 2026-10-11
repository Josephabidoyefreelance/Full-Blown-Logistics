'use client';

import { useState } from 'react';

// Supports the existing attachment format: "📎 filename|https://...".
export default function MessageContent({ message }: { message: string }) {
  const match = message.match(/^📎 (.+)\|(https?:\/\/\S+)$/);
  const [open, setOpen] = useState(false);
  if (!match) return <>{message}</>;

  const [, filename, url] = match;
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:[?#].*)?$/i.test(filename) || /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:[?#].*)?$/i.test(url);
  if (isImage) return <>
    <button type="button" onClick={() => setOpen(true)} className="block max-w-full text-left" title="View image">
      <img src={url} alt={filename} loading="lazy" className="max-h-64 max-w-full rounded-lg object-contain" />
      <span className="mt-1 block break-all text-xs underline">{filename} · Click to enlarge</span>
    </button>
    {open && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={filename} onClick={() => setOpen(false)}>
      <button type="button" className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-2 text-white" onClick={() => setOpen(false)}>Close ✕</button>
      <div className="flex max-h-full max-w-full flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={filename} className="max-h-[82vh] max-w-[92vw] object-contain" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-center text-sm text-white underline">{filename} · Open original</a>
      </div>
    </div>}
  </>;

  return <a href={url} target="_blank" rel="noopener noreferrer" download={filename} className="inline-flex max-w-full items-center gap-1 break-all underline">📎 {filename} ↗</a>;
}
