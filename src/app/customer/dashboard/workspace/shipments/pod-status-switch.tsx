'use client';

import { useTransition } from 'react';
import { updatePodStatus } from './actions';

const STATUS_OPTIONS = ['Pending', 'Resolved'];
const STATUS_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Resolved: '#1f9d5c',
};

export default function PodStatusSwitch({ id, status }: { id: string; status: string }) {
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
          updatePodStatus(id, next);
        });
      }}
      style={{ backgroundColor: color + '22', color }}
      className="rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
