'use client';

import { useRef, useState, useTransition } from 'react';
import { createManifest } from './actions';

type EligibleBooking = {
  id: string;
  tracking_no: string;
  customer_name: string;
  origin: string;
  destination: string;
};

export default function CreateManifestForm({ eligibleBookings }: { eligibleBookings: EligibleBooking[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        + Create manifest
      </button>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
  const labelClass = 'mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400';

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-8">
      <form
        ref={formRef}
        action={(fd) => {
          setError(null);
          fd.set('booking_ids', JSON.stringify(selected));
          startTransition(async () => {
            const res = await createManifest(fd);
            if (res?.error) {
              setError(res.error);
            } else {
              setOpen(false);
              formRef.current?.reset();
              setSelected([]);
            }
          });
        }}
        className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-neutral-900"
      >
        <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Create manifest</h3>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Driver name</label>
            <input name="driver_name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Vehicle number</label>
            <input name="vehicle_number" required className={inputClass} />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Route</label>
            <input name="route" placeholder="e.g. Lagos to Kano" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Manifest date</label>
            <input type="date" name="manifest_date" required className={inputClass} />
          </div>
        </div>

        <label className={labelClass}>Shipments to include</label>
        <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          {eligibleBookings.length === 0 && (
            <p className="p-3 text-xs text-neutral-400 dark:text-neutral-600">
              No unassigned shipments available. Bookings already on a manifest are hidden here.
            </p>
          )}
          {eligibleBookings.map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-center gap-2 border-b border-neutral-100 px-3 py-2 text-sm last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                onChange={() => toggle(b.id)}
                className="h-4 w-4"
              />
              <div>
                <span className="font-mono text-xs text-red-600">{b.tracking_no}</span>
                <span className="ml-2 text-neutral-700 dark:text-neutral-300">{b.customer_name}</span>
                <span className="ml-2 text-xs text-neutral-400">
                  {b.origin} &rarr; {b.destination}
                </span>
              </div>
            </label>
          ))}
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
            {isPending ? 'Creating...' : 'Create manifest'}
          </button>
        </div>
      </form>
    </div>
  );
}
