'use client';

import { useState, useTransition } from 'react';
import { updatePurchaseOrderStatus } from './actions';

export default function PurchaseOrderStatusSwitch({ id, status }: { id: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(async () => {
      await updatePurchaseOrderStatus(id, next);
    });
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={isPending}
      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${
        current === 'Received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      <option value="Pending">Pending</option>
      <option value="Received">Received</option>
    </select>
  );
}
