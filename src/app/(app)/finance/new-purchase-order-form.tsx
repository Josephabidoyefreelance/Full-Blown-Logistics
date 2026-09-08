'use client';

import { useRef, useState, useTransition } from 'react';
import { createPurchaseOrder } from './actions';

export default function NewPurchaseOrderForm() {
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
        + Add purchase order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add purchase order</h2>
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
                  const res = await createPurchaseOrder(fd);
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
              <p className="text-xs text-neutral-400">The PO number is generated automatically when you save.</p>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Supplier</label>
                <input
                  name="supplier"
                  required
                  placeholder="Berger Truck Parts"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Brake pads, filters, and hydraulic hoses for fleet maintenance"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Total (₦)</label>
                  <input
                    type="number"
                    name="total"
                    placeholder="310000"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Date</label>
                  <input
                    type="date"
                    name="order_date"
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
                  <option value="Received">Received</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Adding...' : 'Add purchase order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
