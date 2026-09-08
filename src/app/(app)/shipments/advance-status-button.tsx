'use client';

import { useTransition } from 'react';
import { updateBookingStatus } from './actions';

export default function AdvanceStatusButton({ id, nextStatus }: { id: string; nextStatus: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          updateBookingStatus(id, nextStatus);
        });
      }}
      className="w-full rounded-lg border border-neutral-300 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {isPending ? 'Updating...' : `Advance to ${nextStatus}`}
    </button>
  );
}
