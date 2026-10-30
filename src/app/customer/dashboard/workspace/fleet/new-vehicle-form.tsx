'use client';

import { useRef, useState, useTransition } from 'react';
import { createVehicle } from './actions';

const input = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const label = 'mb-1 block text-xs font-medium text-neutral-500';

export default function NewVehicleForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
        + Add vehicle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6">
          <form
            ref={ref}
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await createVehicle(fd);
                if (res?.error) setError(res.error);
                else { ref.current?.reset(); setOpen(false); }
              });
            }}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add fleet vehicle</h2>
                <p className="text-xs text-neutral-500">Register a truck, van, car or specialist logistics vehicle.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400">✕</button>
            </div>

            {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div><label className={label}>Registration / plate</label><input name="plate" required placeholder="LAG-123-XY" className={input} /></div>
              <div><label className={label}>Vehicle type</label><input name="type" required placeholder="Truck / Van / Trailer" className={input} /></div>
              <div>
                <label className={label}>Operational status</label>
                <select name="status" defaultValue="Available" className={input}>
                  <option>Available</option><option>In Transit</option><option>Maintenance</option><option>Out of service</option><option>Idle</option>
                </select>
              </div>
              <div><label className={label}>Next service date</label><input type="date" name="next_service_date" className={input} /></div>
              <div className="md:col-span-2"><label className={label}>Insurer</label><input name="insurer" placeholder="e.g. AXA Mansard" className={input} /></div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Cancel</button>
              <button disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Save vehicle'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
