'use client';

import { useTransition } from 'react';
import { setLeaveStatus } from './actions';

export default function LeaveActions({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  if (status !== 'Requested') {
    return <span className="text-xs text-neutral-500">{status}</span>;
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => { setLeaveStatus(id, 'Approved'); })}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold hover:bg-neutral-50"
      >
        Approve
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => { setLeaveStatus(id, 'Declined'); })}
        className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Decline
      </button>
    </div>
  );
}
