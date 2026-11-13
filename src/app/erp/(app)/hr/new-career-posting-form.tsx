'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCareerPosting } from './actions';

export default function NewCareerPostingForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        + Post a role
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Post a role</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-xs text-neutral-400">
              This posts live to the Careers section of the website.
            </p>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <form
              ref={formRef}
              action={(fd) => {
                setError(null);
                startTransition(async () => {
                  const res = await createCareerPosting(fd);
                  if (res?.error) {
                    setError(res.error);
                    return;
                  }
                  formRef.current?.reset();
                  setOpen(false);
                  router.refresh();
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Job title</label>
                <input
                  name="title"
                  required
                  placeholder="Fleet Manager"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Location</label>
                  <input
                    name="location"
                    defaultValue="Lagos, Nigeria"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Type</label>
                  <select
                    name="employment_type"
                    defaultValue="Full-time"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Description</label>
                <textarea
                  name="description"
                  required
                  rows={6}
                  placeholder="Job summary, responsibilities, required skills and qualifications..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Posting...' : 'Post role'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
