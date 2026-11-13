'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeCareerPosting } from './actions';

export default function RemovePostingButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Remove "${title}" from the careers page? This can't be undone.`)) return;
        startTransition(async () => {
          await removeCareerPosting(id);
          router.refresh();
        });
      }}
      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
