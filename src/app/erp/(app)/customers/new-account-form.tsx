'use client';

import { useRef, useState, useTransition } from 'react';
import { createCustomer } from './actions';

type Staff = { id: string; full_name: string | null };

export default function NewAccountForm({ staff }: { staff: Staff[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        + New account
      </button>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
  const labelClass = 'mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-8">
      <form
        ref={formRef}
        action={(fd) => {
          setError(null);
          startTransition(async () => {
            const res = await createCustomer(fd);
            if (res?.error) setError(res.error);
            else {
              setOpen(false);
              formRef.current?.reset();
            }
          });
        }}
        className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900"
      >
        <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">New account</h3>

        <div className="mb-3">
          <label className={labelClass}>Account name *</label>
          <input name="name" required className={inputClass} />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Type</label>
            <select name="type" defaultValue="B2B" className={inputClass}>
              <option>B2B</option>
              <option>B2C</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue="Active" className={inputClass}>
              <option>Active</option>
              <option>On hold</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>Contact</label>
          <input name="contact" placeholder="Name, phone" className={inputClass} />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Credit limit, NGN</label>
            <input name="credit_limit" type="number" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Opening balance, NGN</label>
            <input name="balance" type="number" className={inputClass} />
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>Client since (year)</label>
          <input name="client_since" placeholder={String(new Date().getFullYear())} className={inputClass} />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Currency</label>
            <select name="currency" defaultValue="NGN" className={inputClass}>
              <option>NGN</option>
              <option>USD</option>
              <option>GBP</option>
              <option>EUR</option>
              <option>GHS</option>
              <option>KES</option>
              <option>ZAR</option>
              <option>CAD</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Tax rate, %</label>
            <input name="tax_rate" type="number" step="0.1" defaultValue="7.5" className={inputClass} />
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass}>Assigned to</label>
          <select name="assigned_to" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || 'Unnamed'}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Saving...' : 'Save account'}
          </button>
        </div>
      </form>
    </div>
  );
}
