'use client';

import { useState, useTransition } from 'react';
import { convertLeadToCustomer } from './actions';

export default function ConvertLeadButton({ id, company }: { id: string; company: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Convert "${company}" to a customer? This moves it out of Leads.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await convertLeadToCustomer(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-red-600 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-500 dark:hover:bg-red-950/30"
      >
        {isPending ? 'Converting...' : 'Convert'}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
