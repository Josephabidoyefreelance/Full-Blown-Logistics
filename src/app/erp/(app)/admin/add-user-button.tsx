'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from './actions';

const fieldClass = 'mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export default function AddUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackIsWarning, setFeedbackIsWarning] = useState(false);

  function closeDialog() {
    if (isPending) return;
    setOpen(false);
    setError('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError('');
    setFeedback('');

    startTransition(async () => {
      try {
        const result = await createUser({
          full_name: String(fd.get('full_name') ?? ''),
          email: String(fd.get('email') ?? ''),
          password: String(fd.get('password') ?? ''),
          role_name: String(fd.get('role_name') ?? ''),
        });
        if (result?.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setFeedbackIsWarning(Boolean(result?.warning));
        setFeedback(result?.warning || 'User account created successfully.');
        router.refresh();
      } catch {
        setError('The user could not be created. Check your connection and try again.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => { setError(''); setFeedback(''); setOpen(true); }}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
      >
        <span aria-hidden="true">+</span> Add user
      </button>
      {feedback && <p role="status" className={`max-w-xs text-right text-xs ${feedbackIsWarning ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>{feedback}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-user-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Administration</p>
                <h2 id="add-user-title" className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add user account</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Create a JAAD login and assign a role.</p>
              </div>
              <button type="button" onClick={closeDialog} disabled={isPending} aria-label="Close add user dialog" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800">✕</button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-user-name" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Full name</label>
                <input id="new-user-name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="new-user-email" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Work email</label>
                <input id="new-user-email" name="email" type="email" required maxLength={254} autoComplete="email" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="new-user-password" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Temporary password</label>
                <input id="new-user-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} />
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Use at least 8 characters. Share credentials securely, never in an announcement.</p>
              </div>
              <div>
                <label htmlFor="new-user-role" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Role</label>
                <select id="new-user-role" name="role_name" required defaultValue="Staff" className={fieldClass}>
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeDialog} disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
                <button type="submit" disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Creating…' : 'Create user'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
