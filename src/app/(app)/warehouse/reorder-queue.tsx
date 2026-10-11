'use client';

import { useState } from 'react';

type Item = {
  id: string;
  sku: string;
  name: string;
  qty: number;
  reorder_level: number;
  location: string | null;
};

export default function ReorderQueue({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <div className="h-full rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:shadow-md dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">Reorder queue</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900 dark:text-amber-200">{items.length}</p>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">Items at or below reorder level · click to review</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Procurement review</p><h2 className="text-lg font-semibold">Reorder Queue</h2><p className="text-xs text-neutral-500">These items are at or below their configured reorder level.</p></div>
              <button onClick={() => setOpen(false)} className="text-xl text-neutral-400">×</button>
            </div>

            <div className="mt-4 space-y-2">
              {!items.length ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">Nothing currently needs reordering.</div>
              ) : items.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-neutral-500">{item.sku} · {item.qty} in stock · reorder level {item.reorder_level} · {item.location ?? 'No location'}</p></div>
                  <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600">Review / Reorder</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
