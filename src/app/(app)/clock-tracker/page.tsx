import { createClient } from '@/lib/supabase/server';
import ClockButton from './clock-button';

export default async function ClockTrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id ?? '')
    .single();

  // Check if user is currently clocked in
  const { data: activeEntry } = await supabase
    .from('clock_entries')
    .select('id, clock_in, notes')
    .eq('user_id', user?.id ?? '')
    .is('clock_out', null)
    .single();

  // Recent entries for this user
  const { data: entries } = await supabase
    .from('clock_entries')
    .select('id, clock_in, clock_out, notes, duration_minutes')
    .eq('user_id', user?.id ?? '')
    .not('clock_out', 'is', null)
    .order('clock_in', { ascending: false })
    .limit(20);

  // All entries for admin view
  const { data: allEntries } = await supabase
    .from('clock_entries')
    .select('id, user_name, clock_in, clock_out, duration_minutes, notes')
    .order('clock_in', { ascending: false })
    .limit(100);

  const isClockedIn = !!activeEntry;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Clock Tracker</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Track your work sessions. Clock in when you start, clock out when you finish.</p>
      </div>

      {/* Clock in/out card */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{profile?.full_name ?? 'You'}</p>
            {isClockedIn ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                Clocked in at {new Date(activeEntry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : (
              <p className="text-xs text-neutral-400">Not clocked in</p>
            )}
          </div>
          <ClockButton
            isClockedIn={isClockedIn}
            activeEntryId={activeEntry?.id ?? null}
            userId={user?.id ?? ''}
            userName={profile?.full_name ?? ''}
          />
        </div>
      </div>

      {/* My recent sessions */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">My Recent Sessions</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Clock In</th>
                <th className="px-4 py-2.5">Clock Out</th>
                <th className="px-4 py-2.5">Duration</th>
                <th className="px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((e) => (
                <tr key={e.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                    {new Date(e.clock_in).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                    {new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                    {e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                    {e.duration_minutes != null ? `${Math.floor(e.duration_minutes / 60)}h ${e.duration_minutes % 60}m` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-500">{e.notes ?? '—'}</td>
                </tr>
              ))}
              {!entries?.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-400">No sessions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All staff sessions - admin view */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">All Staff Sessions</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-2.5">Staff</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Clock In</th>
                <th className="px-4 py-2.5">Clock Out</th>
                <th className="px-4 py-2.5 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {(allEntries ?? []).map((e) => (
                <tr key={e.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{e.user_name}</td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                    {new Date(e.clock_in).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                    {new Date(e.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                    {e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-neutral-600 dark:text-neutral-400">
                    {e.duration_minutes != null ? `${Math.floor(e.duration_minutes / 60)}h ${e.duration_minutes % 60}m` : '—'}
                  </td>
                </tr>
              ))}
              {!allEntries?.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-400">No sessions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
