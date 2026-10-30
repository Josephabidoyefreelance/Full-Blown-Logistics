'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTicket } from './actions';

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'] as const;
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#63676f',
  Normal: '#2563c7',
  High: '#ca8a04',
  Urgent: '#e2362b',
};
const STATUS_OPTIONS = ['Open', 'Resolved'] as const;
const STATUS_COLORS: Record<string, string> = { Open: '#ca8a04', Resolved: '#1f9d5c' };

function TicketSelect({
  id,
  value,
  field,
}: {
  id: string;
  value: string;
  field: 'priority' | 'status';
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [isPending, startTransition] = useTransition();
  const options = field === 'priority' ? PRIORITY_OPTIONS : STATUS_OPTIONS;
  const colors = field === 'priority' ? PRIORITY_COLORS : STATUS_COLORS;
  const color = colors[selected] ?? '#888';

  // Keep the control in sync after the server refreshes or another agent changes the ticket.
  useEffect(() => setSelected(value), [value]);

  function handleChange(nextValue: string) {
    const previousValue = selected;
    setSelected(nextValue);
    startTransition(async () => {
      const result = await updateTicket(id, field, nextValue);
      if (result?.error) {
        setSelected(previousValue);
        window.alert(`Ticket ${field} could not be updated: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <select
      aria-label={field === 'priority' ? 'Ticket priority' : 'Ticket status'}
      value={selected}
      disabled={isPending}
      onChange={(event) => handleChange(event.target.value)}
      style={{ backgroundColor: color + '22', color }}
      className="inline-flex max-w-full cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-offset-1 focus:ring-2 focus:ring-red-500 disabled:cursor-wait disabled:opacity-60"
    >
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export function PrioritySwitch({ id, value }: { id: string; value: string }) {
  return <TicketSelect id={id} value={value} field="priority" />;
}

export function TicketStatusSwitch({ id, value }: { id: string; value: string }) {
  return <TicketSelect id={id} value={value} field="status" />;
}
