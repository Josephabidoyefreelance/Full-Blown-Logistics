'use client';

import { useTransition } from 'react';
import { updateMaintenanceStatus } from './actions';

const STATUS_OPTIONS = ['Scheduled', 'In Progress', 'Completed'] as const;

export default function MaintenanceStatusSwitch({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      key={status}
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const result = await updateMaintenanceStatus(id, next);
          if (result?.error) window.alert(result.error);
        });
      }}
      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
    >
      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
