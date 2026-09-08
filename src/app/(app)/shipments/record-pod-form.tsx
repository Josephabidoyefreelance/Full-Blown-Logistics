'use client';

import { useRef, useState, useTransition } from 'react';
import { recordProofOfDelivery } from './actions';

type EligibleBooking = {
  id: string;
  tracking_no: string;
  customer_name: string;
};

type Staff = { id: string; full_name: string | null };

export default function RecordPodForm({
  eligibleBookings,
  staff,
}: {
  eligibleBookings: EligibleBooking[];
  staff: Staff[];
}) {
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
        + Record delivery
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
            const res = await recordProofOfDelivery(fd);
            if (res?.error) {
              setError(res.error);
            } else {
              setOpen(false);
              formRef.current?.reset();
            }
          });
        }}
        className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-neutral-900"
      >
        <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Record delivery</h3>

        <label className={labelClass}>Shipment</label>
        <select name="booking_id" required className={`mb-3 ${inputClass}`}>
          <option value="">Select a shipment</option>
          {eligibleBookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.tracking_no} &middot; {b.customer_name}
            </option>
          ))}
        </select>

        <label className={labelClass}>Received by</label>
        <input name="received_by" required placeholder="Name of person who received it" className={`mb-3 ${inputClass}`} />

        <label className={labelClass}>Staff</label>
        <select name="recorded_by" className={`mb-3 ${inputClass}`}>
          <option value="">None</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name || 'Unnamed'}
            </option>
          ))}
        </select>

        {eligibleBookings.length === 0 && (
          <p className="mb-3 text-xs text-neutral-400 dark:text-neutral-600">
            No shipments marked Delivered yet without a proof of delivery on file.
          </p>
        )}

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
            {isPending ? 'Saving...' : 'Record delivery'}
          </button>
        </div>
      </form>
    </div>
  );
}
