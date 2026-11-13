'use client';

import { useState, useTransition } from 'react';
import { updateDriverStatus } from './actions';

const STATUS_OPTIONS = ['Available', 'On trip', 'Off duty', 'Unavailable'];
const STATUS_COLORS: Record<string, string> = {
  Available: '#1f9d5c',
  'On trip': '#2563c7',
  'Off duty': '#63676f',
  Unavailable: '#b42318',
};

export default function DriverStatusSwitch({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function changeStatus(next: string) {
    const previous = current;
    setCurrent(next);
    setOpen(false);
    startTransition(async () => {
      const result = await updateDriverStatus(id, next);
      if (result?.error) {
        setCurrent(previous);
        window.alert(result.error);
      }
    });
  }

  const color = STATUS_COLORS[current] ?? '#888';

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-neutral-700/60 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:border-neutral-500 disabled:opacity-60"
        style={{ backgroundColor: color + '18', color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {current}
        <span className="text-[10px] opacity-70">⌄</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close status menu"
            className="fixed inset-0 z-[300] cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-[301] mt-2 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-950">
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Driver status</div>
            {STATUS_OPTIONS.map((option) => {
              const optionColor = STATUS_COLORS[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeStatus(option)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${option === current ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: optionColor }} />
                  {option}
                  {option === current && <span className="ml-auto text-[11px]">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
