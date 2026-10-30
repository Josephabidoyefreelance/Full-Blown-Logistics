'use client';

import { useTransition } from 'react';
import { updateApplicantStage } from './actions';

const STAGE_OPTIONS = ['Screening', 'Interview', 'Offer'];
const STAGE_COLORS: Record<string, string> = {
  Screening: '#2563c7',
  Interview: '#ca8a04',
  Offer: '#1f9d5c',
};

export default function StageSwitch({ id, stage }: { id: string; stage: string }) {
  const [isPending, startTransition] = useTransition();
  const color = STAGE_COLORS[stage] ?? '#888';

  return (
    <select
      defaultValue={stage}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateApplicantStage(id, next);
        });
      }}
      style={{ backgroundColor: color + '22', color }}
      className="rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none"
    >
      {STAGE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
