'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserStatus } from './actions';

export default function UserStatusSwitch({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const isSuspended = String(status).toLowerCase() === 'suspended';
  const isActive = String(status).toLowerCase() === 'active';

  function toggle() {
    const next = isSuspended ? 'Active' : 'Suspended';
    const ok = window.confirm(next === 'Suspended'
      ? 'Suspend this user? They will be blocked from starting new sessions.'
      : 'Reactivate this user account?');
    if (!ok) return;

    setError('');
    setWarning('');
    startTransition(async () => {
      try {
        const result = await updateUserStatus(id, next);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setWarning(result?.warning || '');
        router.refresh();
      } catch {
        setError('The account status could not be updated. Please retry.');
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5">
      <div className="flex items-center justify-end gap-2.5">
        <span className={`inline-flex min-w-[76px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          isSuspended
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            : isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
        }`}>
          {isSuspended ? 'Suspended' : isActive ? 'Active' : status || 'Unknown'}
        </span>
        <button
          type="button"
          onClick={toggle}
          disabled={isPending || (!isSuspended && !isActive)}
          aria-label={`${isSuspended ? 'Reactivate' : 'Suspend'} user`}
          className={`inline-flex h-8 min-w-[86px] items-center justify-center rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isSuspended
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isPending ? 'Saving…' : isSuspended ? 'Reactivate' : 'Suspend'}
        </button>
      </div>
      {error && <p role="alert" className="max-w-[250px] text-right text-xs text-red-600 dark:text-red-400">{error}</p>}
      {warning && <p role="status" className="max-w-[250px] text-right text-xs text-amber-700 dark:text-amber-300">{warning}</p>}
    </div>
  );
}
