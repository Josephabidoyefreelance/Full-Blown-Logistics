'use client';

import { useState, useTransition } from 'react';
import { updateInvoiceStatus } from './actions';

export default function StatusSwitch({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(async () => {
      await updateInvoiceStatus(id, next);
    });
  }

  const colorClass =
    current === 'Paid'
      ? 'bg-green-100 text-green-700'
      : current === 'Overdue'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={isPending}
      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${colorClass}`}
    >
      <option value="Pending">Pending</option>
      <option value="Paid">Paid</option>
      <option value="Overdue">Overdue</option>
    </select>
  );
}
