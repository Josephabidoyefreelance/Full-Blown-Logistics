'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voteEmployee } from './actions';

export default function VoteButton({ id, votes }: { id: string; votes: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await voteEmployee(id, votes);
          router.refresh();
        });
      }}
      className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {isPending ? 'Voting...' : 'Vote'}
    </button>
  );
}
