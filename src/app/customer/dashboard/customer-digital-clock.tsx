"use client";

import { useEffect, useState } from 'react';

export default function CustomerDigitalClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return <div aria-label="Current local time" className="min-w-[94px] text-right text-[11px] text-neutral-500">--:--:--</div>;
  return (
    <div aria-label={`Current local time ${now.toLocaleTimeString()}`} title={now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      className="min-w-[112px] text-right leading-tight">
      <div className="font-mono text-[12px] font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
      <div className="mt-0.5 text-[9px] text-neutral-500 dark:text-neutral-400">{now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</div>
    </div>
  );
}
