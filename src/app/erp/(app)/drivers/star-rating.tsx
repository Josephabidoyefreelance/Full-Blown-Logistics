'use client';

import { useState, useTransition } from 'react';
import { updateDriverCategoryRating, type RatingColumn } from './actions';

export default function StarRating({ id, column, value }: { id: string; column: RatingColumn; value: number | null }) {
  const [current, setCurrent] = useState(value ?? 0);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-0.5" aria-label={`${current || 0} out of 5`}>
      {[1,2,3,4,5].map((star) => (
        <button key={star} type="button" disabled={pending} onClick={() => {
          const previous = current;
          setCurrent(star);
          startTransition(async () => {
            const result = await updateDriverCategoryRating(id, column, star);
            if (result?.error) { setCurrent(previous); window.alert(result.error); }
          });
        }} className={`text-sm leading-none ${star <= current ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-700'}`} aria-label={`Rate ${star} of 5`}>★</button>
      ))}
    </div>
  );
}
