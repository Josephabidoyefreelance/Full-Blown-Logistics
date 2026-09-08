'use client';

import { useTransition } from 'react';
import { updateUserStatus } from './actions';

export default function UserStatusSwitch({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const isSuspended = status === 'Suspended';

  function toggle() {
    const next = isSuspended ? 'Active' : 'Suspended';
    startTransition(async () => {
      await updateUserStatus(id, next);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          isSuspended
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}
      >
        {isSuspended ? 'Suspended' : 'Active'}
      </span>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          isSuspended
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {isPending ? '...' : isSuspended ? 'Activate' : 'Suspend'}
      </button>
    </div>
  );
}
