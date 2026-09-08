'use client';

import { useState, useTransition } from 'react';
import { clockIn, clockOut } from './actions';

export default function ClockButton({
  isClockedIn,
  activeEntryId,
  userId,
  userName,
}: {
  isClockedIn: boolean;
  activeEntryId: string | null;
  userId: string;
  userName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  function handleClockIn() {
    startTransition(async () => {
      await clockIn(userId, userName);
    });
  }

  function handleClockOut() {
    if (!activeEntryId) return;
    startTransition(async () => {
      await clockOut(activeEntryId, notes);
      setShowNotes(false);
      setNotes('');
    });
  }

  if (isClockedIn) {
    return (
      <div className="flex items-center gap-2">
        {showNotes ? (
          <div className="flex items-center gap-2">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <button
              onClick={handleClockOut}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNotes(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Clock Out
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClockIn}
      disabled={isPending}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? 'Clocking in...' : 'Clock In'}
    </button>
  );
}
