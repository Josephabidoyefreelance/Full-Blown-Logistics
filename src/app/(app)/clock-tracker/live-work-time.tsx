'use client';
import { useEffect, useState } from 'react';

const WORKDAY_MINUTES = 8 * 60;
const WORKWEEK_MINUTES = 40 * 60;

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function LiveWorkTime({
  clockIn, clockOut = null, regularMinutesBefore = 0, regularWeekMinutesBefore = 0,
  compact = false, display = 'both', pausedAt = null, pausedSeconds = 0, weeklyMinutesBefore = 0,
}: {
  clockIn: string; clockOut?: string | null; regularMinutesBefore?: number;
  regularWeekMinutesBefore?: number; compact?: boolean;
  display?: 'both' | 'regular' | 'overtime' | 'elapsed' | 'weekly'; pausedAt?: string | null; pausedSeconds?: number; weeklyMinutesBefore?: number;
}) {
  // Keep the first render identical on the server and client. Calling Date.now()
  // in the state initializer causes a React hydration mismatch. Start the clock
  // only after hydration, then update it once per second.
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (clockOut) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [clockOut]);

  const end = clockOut ? new Date(clockOut).getTime() : now;
  const pausedNowMs = pausedAt ? Math.max(0, end - new Date(pausedAt).getTime()) : 0;
  const elapsedMs = Math.max(0, end - new Date(clockIn).getTime() - Math.max(0, pausedSeconds) * 1000 - pausedNowMs);
  const regularRemainingMinutes = Math.min(
    Math.max(0, WORKDAY_MINUTES - Math.max(0, regularMinutesBefore)),
    Math.max(0, WORKWEEK_MINUTES - Math.max(0, regularWeekMinutesBefore)),
  );
  const regularMs = Math.min(elapsedMs, regularRemainingMinutes * 60_000);
  const overtimeMs = Math.max(0, elapsedMs - regularMs);
  const weeklyMs = Math.max(0, weeklyMinutesBefore) * 60_000 + elapsedMs;

  if (compact) {
    if (display === 'regular') return <span className="tabular-nums">{formatDuration(regularMs)}</span>;
    if (display === 'overtime') return <span className={`tabular-nums ${overtimeMs > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : ''}`}>{formatDuration(overtimeMs)}</span>;
    if (display === 'elapsed') return <span className="tabular-nums">{formatDuration(elapsedMs)}</span>;
    if (display === 'weekly') return <span className="tabular-nums">{formatDuration(weeklyMs)}</span>;
  }

  const regularTodayMs = Math.min(WORKDAY_MINUTES * 60_000, Math.max(0, regularMinutesBefore) * 60_000 + regularMs);
  return <div className="mt-2 flex flex-wrap items-center text-xs tabular-nums [&>span]:mr-3 [&>span]:mb-1">
    <span>Regular today <strong className="font-semibold">{formatDuration(regularTodayMs)}</strong></span>
    <span>Overtime <strong className={overtimeMs > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'font-semibold'}>{formatDuration(overtimeMs)}</strong></span>
    {pausedAt && <span className="font-semibold text-amber-600 dark:text-amber-400">Timer paused</span>}
  </div>;
}
