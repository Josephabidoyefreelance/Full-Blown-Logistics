'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logSupportCall } from './actions';

type Call = { id: string; number: string; status: string; created_at: string };

export default function CallPanel({ history }: { history: Call[] }) {
  const [tab, setTab] = useState<'call' | 'log'>('call');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['call', 'log'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? 'bg-red-600 text-white' : 'border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            {t === 'call' ? 'Call' : 'Call log'}
          </button>
        ))}
      </div>

      {tab === 'call' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Internet call</h3>
          <p className="mb-4 text-xs text-neutral-400">
            Call stays inside the ERP interface. Live internet calling requires a voice/WebRTC provider and signalling service.
          </p>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <form
            ref={formRef}
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await logSupportCall(fd);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                formRef.current?.reset();
                setTab('log');
                router.refresh();
              });
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-neutral-500">Number</label>
              <input
                name="number"
                required
                placeholder="08061234567"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Calling...' : 'Call'}
            </button>
          </form>
        </div>
      )}

      {tab === 'log' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[200px_1fr_160px] items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <div>Number</div>
              <div>Status</div>
              <div className="text-right">Date</div>
            </div>
            {history.map((c) => (
              <div key={c.id} className="grid grid-cols-[200px_1fr_160px] items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800">
                <div className="truncate text-neutral-700 dark:text-neutral-300">{c.number}</div>
                <div className="truncate text-neutral-500 dark:text-neutral-400">{c.status}</div>
                <div className="text-right text-xs text-neutral-400">{new Date(c.created_at).toLocaleString()}</div>
              </div>
            ))}
            {!history.length && <div className="px-5 py-8 text-center text-neutral-400">No calls logged yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
