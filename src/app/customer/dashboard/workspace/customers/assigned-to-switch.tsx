'use client';

import { useTransition } from 'react';
import { updateCustomerAssignedTo } from './actions';

type Staff = { id: string; full_name: string | null };

export default function AssignedToSwitch({
  id,
  assignedTo,
  staff,
}: {
  id: string;
  assignedTo: string | null;
  staff: Staff[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      key={assignedTo ?? 'none'}
      defaultValue={assignedTo ?? ''}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value || null;
        startTransition(() => {
          updateCustomerAssignedTo(id, next);
        });
      }}
      className="w-fit max-w-full justify-self-start truncate rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
    >
      <option value="">None</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.full_name || 'Unnamed'}
        </option>
      ))}
    </select>
  );
}
