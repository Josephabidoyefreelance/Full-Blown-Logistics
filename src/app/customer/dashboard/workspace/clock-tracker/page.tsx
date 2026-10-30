import { createClient } from '@/lib/supabase/server';
import ClockButton from './clock-button';
import LiveWorkTime from './live-work-time';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' };
const dateFormat: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Lagos' };
const WORKDAY_MINUTES = 8 * 60;
const WORKWEEK_MINUTES = 40 * 60;

function durationLabel(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  return `${Math.floor(safeMinutes / 60)}h ${safeMinutes % 60}m`;
}
function getLagosDayKey(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
function getLagosWeekKey(value: string | Date) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const y = Number(parts.find(p => p.type === 'year')?.value); const m = Number(parts.find(p => p.type === 'month')?.value); const d = Number(parts.find(p => p.type === 'day')?.value);
  const local = new Date(Date.UTC(y, m - 1, d)); const weekday = (local.getUTCDay() + 6) % 7; local.setUTCDate(local.getUTCDate() - weekday);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth()+1).padStart(2,'0')}-${String(local.getUTCDate()).padStart(2,'0')}`;
}
function displayDate(value: string) { return new Date(value).toLocaleDateString('en-GB', dateFormat); }
function displayTime(value: string | null) { return value ? new Date(value).toLocaleTimeString('en-GB', timeFormat) : '—'; }

const th = 'px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const centerTh = `${th} text-center`;
const td = 'px-2 py-2 text-left align-middle text-sm text-neutral-700 dark:text-neutral-200';
const centerTd = `${td} text-center tabular-nums`;
const rightTd = `${td} text-right`;

export default async function ClockTrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user?.id ?? '').maybeSingle();

  const { data: activeEntry } = await supabase
    .from('clock_entries').select('id, clock_in, notes, paused_at, pause_reason, paused_seconds, idle_seconds')
    .eq('user_id', user?.id ?? '').is('clock_out', null)
    .order('clock_in', { ascending: false }).limit(1).maybeSingle();

  const { data: allEntries } = await supabase
    .from('clock_entries')
    .select('id, user_name, clock_in, clock_out, notes, paused_at, pause_reason, paused_seconds, idle_seconds')
    .eq('user_id', user?.id ?? '')
    .order('clock_in', { ascending: true })
    .limit(5000);

  const isClockedIn = Boolean(activeEntry);
  const staffName = profile?.full_name || user?.email || 'Staff member';
  const entries = allEntries ?? [];
  const now = Date.now();
  const regularBeforeById = new Map<string, number>();
  const actualMinutesById = new Map<string, number>();
  const weeklyMinutesById = new Map<string, number>();
  const regularMinutesById = new Map<string, number>();
  const overtimeMinutesById = new Map<string, number>();
  const regularUsedByDay = new Map<string, number>();
  const regularUsedByWeek = new Map<string, number>();
  const actualUsedByWeek = new Map<string, number>();
  const regularWeekBeforeById = new Map<string, number>();

  // Apply the 8-hour regular-time limit across all sessions in each Lagos workday,
  // rather than resetting the allowance for every separate clock-in.
  for (const entry of entries) {
    const dayKey = getLagosDayKey(entry.clock_in);
    const usedBefore = regularUsedByDay.get(dayKey) ?? 0;
    const weekKey = getLagosWeekKey(entry.clock_in);
    const weekUsedBefore = regularUsedByWeek.get(weekKey) ?? 0;
    const actualWeekBefore = actualUsedByWeek.get(weekKey) ?? 0;
    regularBeforeById.set(entry.id, usedBefore);
    regularWeekBeforeById.set(entry.id, weekUsedBefore);
    const endMs = entry.clock_out ? new Date(entry.clock_out).getTime() : now;
    const pausedMs = Math.max(0, Number(entry.paused_seconds || 0) * 1000 + (entry.paused_at ? endMs - new Date(entry.paused_at).getTime() : 0));
    const elapsedMinutes = Math.max(0, Math.floor((endMs - new Date(entry.clock_in).getTime() - pausedMs) / 60_000));
    // Duration is the full net worked time. Regular time and overtime are separate classifications.
    const regularMinutes = Math.min(elapsedMinutes, Math.max(0, WORKDAY_MINUTES - usedBefore), Math.max(0, WORKWEEK_MINUTES - weekUsedBefore));
    const overtimeMinutes = Math.max(0, elapsedMinutes - regularMinutes);
    actualMinutesById.set(entry.id, elapsedMinutes);
    weeklyMinutesById.set(entry.id, actualWeekBefore + elapsedMinutes);
    actualUsedByWeek.set(weekKey, actualWeekBefore + elapsedMinutes);
    regularMinutesById.set(entry.id, regularMinutes);
    overtimeMinutesById.set(entry.id, overtimeMinutes);
    regularUsedByDay.set(dayKey, usedBefore + regularMinutes);
    regularUsedByWeek.set(weekKey, weekUsedBefore + regularMinutes);
  }

  const reportEntries = [...entries].reverse();
  const activeRegularBefore = activeEntry ? (regularBeforeById.get(activeEntry.id) ?? 0) : 0;
  const activeRegularWeekBefore = activeEntry ? (regularWeekBeforeById.get(activeEntry.id) ?? 0) : 0;

  return (
    <main className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Clock Tracker</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Record your working hours. Regular time is capped at 8 hours per workday and 40 hours per workweek; additional tracked time is overtime.</p>
        </div>
        <a href="/api/clock-tracker/report"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800">
          <span aria-hidden="true">↓</span> Download PDF report
        </a>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{staffName}</p>
            <p className={`mt-1 flex items-center gap-2 text-xs ${isClockedIn ? (activeEntry?.paused_at ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400') : 'text-neutral-500 dark:text-neutral-400'}`}>
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${isClockedIn ? (activeEntry?.paused_at ? 'bg-amber-500' : 'bg-green-500') : 'bg-neutral-400'}`} />
              {isClockedIn && activeEntry
                ? (activeEntry.paused_at ? `Paused · Clocked in at ${displayTime(activeEntry.clock_in)}` : `On shift · Clocked in at ${displayTime(activeEntry.clock_in)}`)
                : 'Not currently clocked in'}
            </p>
            {isClockedIn && activeEntry && (
              <LiveWorkTime clockIn={activeEntry.clock_in} regularMinutesBefore={activeRegularBefore} regularWeekMinutesBefore={activeRegularWeekBefore} pausedAt={activeEntry.paused_at} pausedSeconds={Number(activeEntry.paused_seconds || 0)} />
            )}
          </div>
          <ClockButton isClockedIn={isClockedIn} activeEntryId={activeEntry?.id ?? null} pausedAt={activeEntry?.paused_at ?? null} />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">My Time Report</h2>
          <span className="text-xs text-neutral-500">Latest 100 sessions</span>
        </div>
        <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[1020px] table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800">
                <th className={th}>Staff</th>
                <th className={centerTh}>Date</th>
                <th className={centerTh}>Clock In</th>
                <th className={centerTh}>Clock Out</th>
                <th className={centerTh}>Duration</th>
                <th className={centerTh}>Weekly Time</th>
                <th className={centerTh}>Overtime</th>
                <th className={centerTh}>Idle Time</th>
                <th className={`${th} text-right`}>Notes for Clock Out</th>
              </tr>
            </thead>
            <tbody>
              {reportEntries.map((entry) => {
                const active = !entry.clock_out;
                return (
                  <tr key={entry.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className={`${td} whitespace-nowrap`}><span className="block truncate" title={entry.user_name || staffName}>{entry.user_name || staffName}</span></td>
                    <td className={`${centerTd} whitespace-nowrap`}>{displayDate(entry.clock_in)}</td>
                    <td className={`${centerTd} whitespace-nowrap`}>{displayTime(entry.clock_in)}</td>
                    <td className={`${centerTd} whitespace-nowrap`}>
                      {entry.clock_out ? displayTime(entry.clock_out) : <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400"><span className="h-2 w-2 rounded-full bg-green-500" />Active</span>}
                    </td>
                    <td className={`${centerTd} whitespace-nowrap`}>
                      {active ? <LiveWorkTime clockIn={entry.clock_in} compact display="elapsed" pausedAt={entry.paused_at} pausedSeconds={Number(entry.paused_seconds || 0)} /> : durationLabel(actualMinutesById.get(entry.id) ?? 0)}
                    </td>
                    <td className={`${centerTd} whitespace-nowrap`}>
                      {active ? <LiveWorkTime clockIn={entry.clock_in} compact display="weekly" weeklyMinutesBefore={actualUsedByWeek.get(getLagosWeekKey(entry.clock_in)) ? Math.max(0, (actualUsedByWeek.get(getLagosWeekKey(entry.clock_in)) ?? 0) - (actualMinutesById.get(entry.id) ?? 0)) : 0} pausedAt={entry.paused_at} pausedSeconds={Number(entry.paused_seconds || 0)} /> : durationLabel(weeklyMinutesById.get(entry.id) ?? 0)}
                    </td>
                    <td className={`${centerTd} whitespace-nowrap`}>
                      {active ? <LiveWorkTime clockIn={entry.clock_in} regularMinutesBefore={regularBeforeById.get(entry.id) ?? 0} regularWeekMinutesBefore={regularWeekBeforeById.get(entry.id) ?? 0} compact display="overtime" pausedAt={entry.paused_at} pausedSeconds={Number(entry.paused_seconds || 0)} /> : durationLabel(overtimeMinutesById.get(entry.id) ?? 0)}
                    </td>
                    <td className={`${centerTd} whitespace-nowrap text-amber-700 dark:text-amber-400`}>{durationLabel(Math.floor(Number(entry.idle_seconds || 0) / 60))}</td>
                    <td className={rightTd}><span className="block truncate text-right" title={entry.notes ?? ''}>{entry.notes || '—'}</span></td>
                  </tr>
                );
              })}
              {!reportEntries.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-neutral-400">No time records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
