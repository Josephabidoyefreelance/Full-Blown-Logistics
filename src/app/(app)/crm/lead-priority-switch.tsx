'use client';

import { useTransition } from 'react';
import { updateLeadPriority } from './actions';

const PRIORITY_OPTIONS = ['Hot', 'Warm', 'Cold'];
const PRIORITY_COLORS: Record<string, string> = {
  Hot: '#dc2626',
  Warm: '#d97706',
  Cold: '#2563c7',
};

export default function LeadPrioritySwitch({ id, priority }: { id: string; priority: string }) {
  const [isPending, startTransition] = useTransition();
  const color = PRIORITY_COLORS[priority] ?? '#888';

  return (
    <select
      key={priority}
      defaultValue={priority}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateLeadPriority(id, next);
        });
      }}
      style={{ backgroundColor: color + '22', color }}
      className="rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {PRIORITY_OPTIONS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
