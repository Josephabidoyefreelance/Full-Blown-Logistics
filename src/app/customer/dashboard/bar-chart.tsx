'use client';

type Bar = { label: string; value: number; color: string };

export default function BarChart({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 print:border-neutral-300">
      <h4 className="mb-4 text-sm font-bold text-[var(--text)] print:text-black">{title}</h4>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="text-[var(--subtext)] print:text-neutral-600">{b.label}</span>
              <span className="font-semibold text-[var(--text)] print:text-black">
                {'\u20a6'}{b.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--input-bg)] print:bg-neutral-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (b.value / max) * 100)}%`, backgroundColor: b.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
