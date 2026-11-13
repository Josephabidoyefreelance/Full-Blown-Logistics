'use client';

import { useEffect, useState } from 'react';

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return <span className="hidden text-xs text-neutral-500 lg:inline">--:--:--</span>;
  return <time dateTime={now.toISOString()} title={now.toLocaleDateString()} className="hidden whitespace-nowrap rounded-lg border border-neutral-200 px-2.5 py-2 text-xs font-medium tabular-nums text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 sm:inline-flex">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>;
}
