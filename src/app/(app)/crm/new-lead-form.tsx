'use client';

import { useRef, useState, useTransition } from 'react';
import { createLead } from './actions';

export default function NewLeadForm() {
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
        + New lead
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
            const res = await createLead(fd);
            if (res?.error) setError(res.error);
            else {
              setOpen(false);
              formRef.current?.reset();
            }
          });
        }}
        className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900"
      >
        <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">New lead</h3>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Company name *</label>
            <input name="company" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contact name *</label>
            <input name="contact_name" required className={inputClass} />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <input name="phone" required className={inputClass} />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Source</label>
            <select name="source" className={inputClass}>
              <option>Website</option>
              <option>Referral</option>
              <option>Cold Call</option>
              <option>Social Media</option>
              <option>Trade Show</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select name="priority" defaultValue="Warm" className={inputClass}>
              <option>Hot</option>
              <option>Warm</option>
              <option>Cold</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Transport mode</label>
            <select name="transport_mode" className={inputClass}>
              <option>Trucks / Haulage</option>
              <option>RORO</option>
              <option>Sea Freight</option>
              <option>Air Freight</option>
              <option>Cargo</option>
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Origin</label>
            <input name="origin" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <input name="destination" className={inputClass} />
          </div>
        </div>

        <label className={labelClass}>Estimated deal value, NGN</label>
        <input type="number" name="value" className={`mb-3 ${inputClass}`} />

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
            {isPending ? 'Saving...' : 'Save lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
