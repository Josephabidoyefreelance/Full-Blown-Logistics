'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { postAnnouncement } from './actions';

const fieldClass = 'mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

type PublishMode = 'now' | 'schedule';

function localDateTimeMin() {
  const date = new Date(Date.now() + 2 * 60_000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PostAnnouncementButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [publishMode, setPublishMode] = useState<PublishMode>('now');
  const [autoExpire, setAutoExpire] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState('5');
  const [minScheduleTime, setMinScheduleTime] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackIsWarning, setFeedbackIsWarning] = useState(false);

  function openDialog() {
    setError('');
    setFeedback('');
    setPublishMode('now');
    setAutoExpire(true);
    setExpiresInHours('5');
    setMinScheduleTime(localDateTimeMin());
    setOpen(true);
  }

  function closeDialog() {
    if (isPending) return;
    setOpen(false);
    setError('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');
    setFeedback('');

    let publishAt: string | null = null;
    if (publishMode === 'schedule') {
      const localValue = String(fd.get('publish_at') ?? '');
      if (!localValue) {
        setError('Choose the date and time when this announcement should appear.');
        return;
      }
      const parsed = new Date(localValue);
      if (Number.isNaN(parsed.getTime())) {
        setError('Choose a valid publication date and time.');
        return;
      }
      publishAt = parsed.toISOString();
    }

    const expiryDuration = autoExpire ? Number(expiresInHours) : null;

    startTransition(async () => {
      try {
        const result = await postAnnouncement({
          title: String(fd.get('title') ?? ''),
          body: String(fd.get('body') ?? ''),
          publishAt,
          expiresInHours: expiryDuration,
        });
        if (result?.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setFeedbackIsWarning(Boolean(result?.warning));
        setFeedback(result?.warning || result?.message || (publishMode === 'schedule' ? 'Announcement scheduled.' : 'Announcement published.'));
        router.refresh();
      } catch {
        setError('The announcement could not be saved. Check your connection and try again.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
      >
        <span aria-hidden="true">+</span> Post announcement
      </button>
      {feedback && <p role="status" className={`max-w-xs text-right text-xs ${feedbackIsWarning ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>{feedback}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="post-announcement-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Company communications</p>
                <h2 id="post-announcement-title" className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Post an announcement</h2>
                <p className="mt-1 text-sm leading-5 text-neutral-500 dark:text-neutral-400">Publish now or schedule a future notice. The notice will automatically disappear from the dashboard when its expiry time passes.</p>
              </div>
              <button type="button" onClick={closeDialog} disabled={isPending} aria-label="Close announcement dialog" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800">✕</button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="announcement-title" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Announcement title</label>
                <input id="announcement-title" name="title" required minLength={3} maxLength={120} placeholder="e.g. Updated warehouse operating hours" className={fieldClass} />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Use a short, specific title (up to 120 characters).</p>
              </div>
              <div>
                <label htmlFor="announcement-body" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Message</label>
                <textarea id="announcement-body" name="body" required minLength={3} maxLength={5000} rows={5} placeholder="Explain what changed, who is affected, and when it takes effect…" className={`${fieldClass} resize-y leading-6`} />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Use short paragraphs and include dates or next steps when relevant. Up to 5,000 characters.</p>
              </div>

              <section aria-labelledby="announcement-expiry-heading" className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-lg text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">⏱</span>
                    <div className="min-w-0">
                      <h3 id="announcement-expiry-heading" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Schedule automatic expiry</h3>
                      <p className="mt-0.5 max-w-lg text-xs leading-5 text-neutral-600 dark:text-neutral-400">Choose how long this notice stays on the main Dashboard. It will disappear automatically when the timer ends.</p>
                    </div>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-xs font-semibold text-neutral-700 dark:border-amber-900/60 dark:bg-neutral-900 dark:text-neutral-200">
                    <input type="checkbox" checked={autoExpire} onChange={(event) => setAutoExpire(event.target.checked)} className="h-4 w-4 accent-red-600" />
                    Auto-expire
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-end">
                  <div>
                    <label htmlFor="announcement-expiry" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Remove from Dashboard after</label>
                    <select id="announcement-expiry" value={expiresInHours} onChange={(event) => setExpiresInHours(event.target.value)} disabled={!autoExpire} className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`}>
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="3">3 hours</option>
                      <option value="4">4 hours</option>
                      <option value="5">5 hours</option>
                      <option value="6">6 hours</option>
                      <option value="8">8 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">24 hours</option>
                      <option value="48">2 days</option>
                      <option value="72">3 days</option>
                    </select>
                  </div>
                  <p className="pb-0.5 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                    {autoExpire
                      ? `Selected: this announcement will disappear ${expiresInHours} hour${expiresInHours === '1' ? '' : 's'} after it goes live.`
                      : 'Automatic expiry is off. The announcement stays on the Dashboard until a Super Admin deletes it.'}
                  </p>
                </div>
              </section>

              <div>
                <label htmlFor="announcement-publish-mode" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Publication timing</label>
                <select id="announcement-publish-mode" value={publishMode} onChange={(event) => setPublishMode(event.target.value as PublishMode)} className={fieldClass}>
                  <option value="now">Publish now</option>
                  <option value="schedule">Schedule for later</option>
                </select>
              </div>

              {publishMode === 'schedule' && (
                <div>
                  <label htmlFor="announcement-publish-at" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Publish date and time</label>
                  <input
                    id="announcement-publish-at"
                    name="publish_at"
                    type="datetime-local"
                    min={minScheduleTime || undefined}
                    required
                    className={fieldClass}
                  />
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Uses your computer's local time. Scheduled notices stay hidden from the dashboard until this time.</p>
                </div>
              )}

              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
              <footer className="flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeDialog} disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
                <button type="submit" disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{isPending ? (publishMode === 'schedule' ? 'Scheduling…' : 'Publishing…') : publishMode === 'schedule' ? 'Schedule announcement' : 'Publish announcement'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
