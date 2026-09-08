'use client';

import { useTransition } from 'react';
import { updateTicket } from './actions';

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#63676f',
  Normal: '#2563c7',
  High: '#ca8a04',
  Urgent: '#e2362b',
};
const STATUS_OPTIONS = ['Open', 'Resolved'];
const STATUS_COLORS: Record<string, string> = { Open: '#ca8a04', Resolved: '#1f9d5c' };

export function PrioritySwitch({ id, value }: { id: string; value: string }) {
  const [isPending, startTransition] = useTransition();
  const color = PRIORITY_COLORS[value] ?? '#888';
  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={(e) => startTransition(() => { updateTicket(id, 'priority', e.target.value); })}
      style={{ backgroundColor: color + '22', color }}
      className="rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {PRIORITY_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export function TicketStatusSwitch({ id, value }: { id: string; value: string }) {
  const [isPending, startTransition] = useTransition();
  const color = STATUS_COLORS[value] ?? '#888';
  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={(e) => startTransition(() => { updateTicket(id, 'status', e.target.value); })}
      style={{ backgroundColor: color + '22', color }}
      className="rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
