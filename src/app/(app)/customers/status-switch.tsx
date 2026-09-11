'use client';

import { useTransition } from 'react';
import { updateCustomerStatus } from './actions';

const STATUS_OPTIONS = ['Active', 'On hold', 'Inactive'];
const STATUS_COLORS: Record<string, string> = {
  Active: '#1f9d5c',
  'On hold': '#ca8a04',
  Inactive: '#e2362b',
};

export default function CustomerStatusSwitch({ id, status }: { id: string; status: string }) {
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
          updateCustomerStatus(id, next);
        });
      }}
      style={{ backgroundColor: color + '22', color }}
      className="w-fit rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
