'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function AuditLogRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-label="Refresh audit log"
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      <span aria-hidden="true" className={isPending ? 'animate-spin' : ''}>↻</span>
      {isPending ? 'Refreshing…' : 'Refresh log'}
    </button>
  );
}
