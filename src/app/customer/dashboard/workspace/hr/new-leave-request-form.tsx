'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLeaveRequest } from './actions';

export default function NewLeaveRequestForm() {
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
        + Apply for leave
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Apply for leave</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <form
              ref={formRef}
              action={(fd) => {
                setError(null);
                startTransition(async () => {
                  const res = await createLeaveRequest(fd);
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
                <label className="mb-1 block text-xs font-medium text-neutral-500">Employee name</label>
                <input
                  name="employee_name"
                  required
                  placeholder="Grace Adeyemi"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Leave type</label>
                <select
                  name="leave_type"
                  defaultValue="Annual"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Paternity">Paternity</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">From</label>
                  <input
                    type="date"
                    name="from_date"
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">To</label>
                  <input
                    type="date"
                    name="to_date"
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <p className="text-xs text-neutral-400">Status starts as Requested and awaits approval.</p>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Apply for leave'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
