import { createClient } from '@/lib/supabase/server';

type DashboardAnnouncement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

function formatAnnouncementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently posted';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Static, server-rendered company announcements for the employee dashboard.
 * Reads through the signed-in Supabase session so database RLS still applies.
 * No scrolling ticker or client-side polling is used.
 */
export default async function DashboardAnnouncements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const announcements = (data ?? []) as DashboardAnnouncement[];

  return (
    <section aria-labelledby="dashboard-announcements-title" className="mb-5 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="dashboard-announcements-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Company announcements
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Important company updates and operational notices.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {error ? 'Currently unavailable' : `${announcements.length} recent ${announcements.length === 1 ? 'notice' : 'notices'}`}
        </span>
      </div>

      {error ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
          Company announcements are temporarily unavailable. Please refresh the dashboard later.
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          There are no company announcements at the moment.
        </div>
      ) : (
        <div className="space-y-2.5">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex gap-3 border-l-4 border-red-600 px-4 py-3.5 sm:px-5">
                <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  !
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      Company update
                    </span>
                    <time dateTime={announcement.created_at} className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatAnnouncementDate(announcement.created_at)}
                    </time>
                  </div>
                  <h3 className="mt-1.5 break-words text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {announcement.title}
                  </h3>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    {announcement.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
