'use client';

import { useState, useTransition } from 'react';
import { updateInsurer } from './actions';

export default function InsurerInput({ id, insurer }: { id: string; insurer: string | null }) {
  const [value, setValue] = useState(insurer ?? '');
  const [isPending, startTransition] = useTransition();

  return (
    <input
      value={value}
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== (insurer ?? '')) {
          startTransition(() => {
            updateInsurer(id, value);
          });
        }
      }}
      placeholder="Insurer"
      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none hover:border-neutral-300 focus:border-red-500 dark:text-neutral-100 dark:hover:border-neutral-700"
    />
  );
}
