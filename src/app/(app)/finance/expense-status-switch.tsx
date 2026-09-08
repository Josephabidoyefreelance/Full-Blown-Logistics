'use client';

import { useState, useTransition } from 'react';
import { updateExpenseStatus } from './actions';

export default function ExpenseStatusSwitch({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(async () => {
      await updateExpenseStatus(id, next);
    });
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={isPending}
      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${
        current === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      <option value="Unpaid">Unpaid</option>
      <option value="Paid">Paid</option>
    </select>
  );
}
