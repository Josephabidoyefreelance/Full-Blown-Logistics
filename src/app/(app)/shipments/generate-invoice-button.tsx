'use client';

import { useState, useTransition } from 'react';
import { generateInvoiceForBooking } from './actions';

export default function GenerateInvoiceButton({
  bookingId,
  compact = false,
}: {
  bookingId: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await generateInvoiceForBooking(bookingId);
      if (res.error) setError(res.error);
      else setInvoiceId(res.invoiceId);
    });
  }

  const sizeClass = compact ? 'py-1.5 text-xs' : 'py-2 text-sm';

  if (invoiceId) {
    return (
      <a
        href={`/finance?view=invoices&open=${invoiceId}`}
        className={`block w-full rounded-lg bg-green-600 text-center font-semibold text-white hover:bg-green-700 ${sizeClass}`}
      >
        {compact ? 'View invoice' : 'Invoice created \u2192 view it'}
      </a>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`w-full rounded-lg bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-60 ${sizeClass}`}
      >
        {isPending ? 'Generating...' : 'Generate invoice'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
