'use client';

import { useState, useTransition } from 'react';
import { importCustomersFromLeads } from './actions';

export default function ImportFromLeadsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleClick() {
    setError(null);
    setResult(null);
    setOpen(true);
    startTransition(async () => {
      const res = await importCustomersFromLeads();
      if (res.error) setError(res.error);
      else setResult({ imported: res.imported, skipped: res.skipped });
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {isPending ? 'Importing...' : 'Import from leads'}
      </button>

      {open && (result || error) && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 flex items-start justify-between">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">Import from leads</span>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Close
            </button>
          </div>
          {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
          {result && (
            <p className="text-neutral-700 dark:text-neutral-300">
              Added {result.imported} new customer{result.imported === 1 ? '' : 's'} from won leads.
              {result.skipped > 0 && ` Skipped ${result.skipped} already on file.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
