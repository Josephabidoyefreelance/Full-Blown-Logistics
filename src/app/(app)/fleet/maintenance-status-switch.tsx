'use client';

import { useTransition } from 'react';
import { updateMaintenanceStatus } from './actions';

const STATUS_OPTIONS = ['Scheduled', 'In Progress', 'Completed'];
const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#ca8a04',
  'In Progress': '#2563c7',
  Completed: '#1f9d5c',
};

export default function MaintenanceStatusSwitch({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const color = STATUS_COLORS[status] ?? '#888';

  return (
    <select
      key={status}
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateMaintenanceStatus(id, next);
        });
      }}
      style={{ backgroundColor: color + '22', color }}
      className="rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s} className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
          {s}
        </option>
      ))}
    </select>
  );
}
