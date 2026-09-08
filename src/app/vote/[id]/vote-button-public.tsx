'use client';

import { useState, useTransition } from 'react';
import { castPublicVote } from './actions';

export default function VoteButtonPublic({ employeeId }: { employeeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (voted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
        Thanks, your vote has been counted.
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={() => {
          startTransition(async () => {
            const res = await castPublicVote(employeeId);
            if (res?.error) {
              setError(res.error);
              return;
            }
            setVoted(true);
          });
        }}
        disabled={isPending}
        className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? 'Casting vote...' : 'Vote for this employee'}
      </button>
    </div>
  );
}
