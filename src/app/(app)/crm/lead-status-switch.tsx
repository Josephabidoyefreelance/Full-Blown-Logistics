'use client';

import { useTransition } from 'react';
import { updateLeadStatus } from './actions';

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost'];
const STATUS_COLORS: Record<string, string> = {
  New: '#63676f',
  Contacted: '#ca8a04',
  Qualified: '#2563c7',
  'Proposal Sent': '#2563c7',
  Won: '#1f9d5c',
  Lost: '#e2362b',
};

export default function LeadStatusSwitch({ id, status }: { id: string; status: string }) {
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
          updateLeadStatus(id, next);
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
