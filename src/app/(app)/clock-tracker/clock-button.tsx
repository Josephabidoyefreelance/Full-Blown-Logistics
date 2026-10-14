'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clockIn, clockOut, setClockPaused } from './actions';
const IDLE_MS = 5 * 60 * 1000;
export default function ClockButton({ isClockedIn, activeEntryId, pausedAt }: { isClockedIn: boolean; activeEntryId: string | null; pausedAt: string | null }) {
  const router = useRouter(); const [isPending, startTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(false); const [notes, setNotes] = useState(''); const [errorMessage, setErrorMessage] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const lastActivity = useRef(Date.now()); const busy = useRef(false);
  const runPause = useCallback((paused: boolean, idlePause = false) => {
    if (!activeEntryId || busy.current) return;
    busy.current = true; setErrorMessage('');
    startTransition(async () => { try { await setClockPaused(activeEntryId, paused, idlePause); router.refresh(); }
      catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Could not update timer state.'); }
      finally { busy.current = false; }
    });
  }, [activeEntryId, router]);
  useEffect(() => {
    if (!isClockedIn || !activeEntryId || pausedAt) { if (idleTimer.current) clearTimeout(idleTimer.current); return; }
    lastActivity.current = Date.now();
    const schedule = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      const remaining = Math.max(0, IDLE_MS - (Date.now() - lastActivity.current));
      idleTimer.current = setTimeout(() => { if (Date.now() - lastActivity.current >= IDLE_MS) runPause(true, true); else schedule(); }, remaining);
    };
    const activity = () => { lastActivity.current = Date.now(); if (document.visibilityState === 'visible') schedule(); };
    const visibility = () => { if (Date.now() - lastActivity.current >= IDLE_MS) runPause(true, true); else schedule(); };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener('visibilitychange', visibility); schedule();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); events.forEach((event) => window.removeEventListener(event, activity)); document.removeEventListener('visibilitychange', visibility); };
  }, [isClockedIn, activeEntryId, pausedAt, runPause]);
  function doClockIn() { setErrorMessage(''); startTransition(async () => { try { await clockIn(); router.refresh(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Could not clock in.'); } }); }
  function doClockOut() { if (!activeEntryId) return; setErrorMessage(''); startTransition(async () => { try { await clockOut(activeEntryId, notes); setShowNotes(false); setNotes(''); router.refresh(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Could not clock out.'); } }); }
  return <div className="flex min-w-0 flex-col items-end gap-2">
    {!isClockedIn ? <button type="button" onClick={doClockIn} disabled={isPending} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">{isPending ? 'Clocking in…' : 'Clock In'}</button> : <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => runPause(!pausedAt, false)} disabled={isPending} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${pausedAt ? 'border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400' : 'border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400'}`}>{pausedAt ? 'Resume' : 'Pause'}</button>
      {!showNotes ? <button type="button" onClick={() => setShowNotes(true)} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">Clock Out</button> : <>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clock-out note (optional)" aria-label="Clock-out note" className="w-48 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800" />
        <button type="button" onClick={doClockOut} disabled={isPending} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm</button>
        <button type="button" onClick={() => setShowNotes(false)} className="rounded-lg border px-3 py-2 text-xs">Cancel</button>
      </>}
    </div>}
    {errorMessage && <p role="alert" className="max-w-sm text-right text-xs text-red-600">{errorMessage}</p>}
  </div>;
}
