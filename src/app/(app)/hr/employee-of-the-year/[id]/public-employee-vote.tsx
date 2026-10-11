'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voteEmployee } from '@/app/(app)/hr/actions';

export default function PublicEmployeeVote({ id, votes }: { id: string; votes: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  return (
    <div className="mt-6">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => {
        const result = await voteEmployee(id, votes);
        setMessage(result?.error ? `Vote failed: ${result.error}` : 'Thank you. Your vote was recorded.');
        if (!result?.error) router.refresh();
      })} className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
        {pending ? 'Submitting vote…' : 'Vote for this employee'}
      </button>
      {message && <p role="status" className="mt-3 text-center text-sm text-neutral-600">{message}</p>}
    </div>
  );
}
