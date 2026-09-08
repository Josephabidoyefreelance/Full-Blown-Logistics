'use client';

import { useTransition } from 'react';
import { updateBookingStatus } from './actions';

const STATUS_OPTIONS = ['Pending', 'Assigned', 'In Transit', 'Delivered', 'Exception', 'Cancelled'];
const STATUS_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Assigned: '#2563c7',
  'In Transit': '#7c3aed',
  Delivered: '#1f9d5c',
  Exception: '#e2362b',
  Cancelled: '#63676f',
};

export default function StatusSwitch({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const color = STATUS_COLORS[status] ?? '#888';

  return (
    <select
      key={status}
      defaultValue={status}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateBookingStatus(id, next);
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
