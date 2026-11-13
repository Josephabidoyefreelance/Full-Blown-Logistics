'use client';

import { useTransition } from 'react';
import { deleteInventoryItem } from './actions';

export default function DeleteItemButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete "${name}" from inventory? This can't be undone.`)) return;
        startTransition(() => {
          deleteInventoryItem(id);
        });
      }}
      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
