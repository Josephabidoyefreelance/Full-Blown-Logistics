type Segment = { label: string; value: number; color: string };

export default function DonutChart({
  total,
  segments,
}: {
  total: number;
  segments: Segment[];
}) {
  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div>
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-neutral-100 dark:text-neutral-800"
              strokeWidth={strokeWidth}
            />
            {total > 0 &&
              segments
                .filter((s) => s.value > 0)
                .map((s) => {
                  const fraction = s.value / total;
                  const dash = fraction * circumference;
                  const gap = circumference - dash;
                  const offset = -((cumulative / total) * circumference);
                  cumulative += s.value;
                  return (
                    <circle
                      key={s.label}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{total}</span>
            <span className="text-[9px] uppercase tracking-widest text-neutral-400">Total</span>
          </div>
        </div>

        <div className="flex-1 divide-y divide-neutral-100 dark:divide-neutral-800">
          {segments.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.label} className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {s.value} <span className="font-normal text-neutral-400">({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-400 dark:border-neutral-800">
        Total: {total}
      </div>
    </div>
  );
}
