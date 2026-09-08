'use client';

import { useTransition } from 'react';
import { updateInsuranceExpiry } from './actions';

export default function InsuranceExpiryInput({
  id,
  insurance_expiry,
}: {
  id: string;
  insurance_expiry: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="date"
      key={insurance_expiry}
      defaultValue={insurance_expiry ?? ''}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateInsuranceExpiry(id, next);
        });
      }}
      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none hover:border-neutral-300 focus:border-red-500 dark:text-neutral-100 dark:hover:border-neutral-700 dark:[color-scheme:dark]"
    />
  );
}
