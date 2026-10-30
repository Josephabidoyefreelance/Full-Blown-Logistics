'use client';

import { useRef, useState, useTransition } from 'react';
import { createInvoice } from './actions';

export default function NewInvoiceForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        + Add invoice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add invoice</h2>
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
                  const res = await createInvoice(fd);
                  if (res?.error) {
                    setError(res.error);
                    return;
                  }
                  formRef.current?.reset();
                  setOpen(false);
                });
              }}
              className="space-y-3"
            >
              <p className="text-xs text-neutral-400">The invoice number is generated automatically when you save.</p>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Customer</label>
                <input
                  name="customer_name"
                  required
                  placeholder="Arbico PLC"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Amount (₦)</label>
                  <input
                    type="number"
                    name="amount"
                    placeholder="4600000"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Date</label>
                  <input
                    type="date"
                    name="invoice_date"
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
                <select
                  name="status"
                  defaultValue="Pending"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Adding...' : 'Add invoice'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
