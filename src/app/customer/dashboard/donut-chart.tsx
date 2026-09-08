'use client';

type Segment = { label: string; value: number; color: string };

export default function DonutChart({
  title,
  total,
  segments,
}: {
  title: string;
  total: number;
  segments: Segment[];
}) {
  const size = 260;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
      <h4 className="mb-3 text-sm font-bold text-[var(--text)]">{title}</h4>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={strokeWidth}
            />
            {segments.map((seg, i) => {
              if (!total || seg.value <= 0) return null;
              const frac = seg.value / total;
              const dash = frac * circumference;
              const dashOffset = -cumulative * circumference;
              cumulative += frac;
              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[var(--text)]">{total}</span>
            <span className="text-[10px] uppercase text-[var(--subtext)]">Total</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-[var(--subtext)]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
              <span className="font-semibold text-[var(--text)]">
                {seg.value} ({total ? Math.round((seg.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
