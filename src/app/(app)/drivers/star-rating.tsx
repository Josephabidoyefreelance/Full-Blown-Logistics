'use client';

import { useState, useTransition } from 'react';
import { updateDriverCategoryRating, type RatingColumn } from './actions';

export default function StarRating({
  id,
  column,
  value,
}: {
  id: string;
  column: RatingColumn;
  value: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [hover, setHover] = useState<number | null>(null);

  const display = hover ?? value ?? 0;

  return (
    <div className="flex" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={isPending}
          onMouseEnter={() => setHover(n)}
          onClick={() => {
            startTransition(() => {
              updateDriverCategoryRating(id, column, n);
            });
          }}
          className="px-0.5 text-sm leading-none disabled:opacity-50"
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <span className={n <= display ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700'}>★</span>
        </button>
      ))}
    </div>
  );
}
