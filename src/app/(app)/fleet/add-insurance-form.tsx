'use client';

import { useRef, useState, useTransition } from 'react';
import { createInsurancePolicy } from './actions';

const input = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const label = 'mb-1 block text-xs font-medium text-neutral-500';

export default function AddInsuranceForm({ vehicles }: { vehicles: { id: string; plate: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">+ Add insurance</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6">
          <form
            ref={ref}
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await createInsurancePolicy(fd);
                if (res?.error) setError(res.error);
                else { ref.current?.reset(); setOpen(false); }
              });
            }}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add insurance policy</h2><p className="text-xs text-neutral-500">Keep fleet compliance and expiry dates visible.</p></div>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400">✕</button>
            </div>
            {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div><label className={label}>Vehicle</label><select name="vehicle_id" required className={input}><option value="">Select vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></div>
              <div><label className={label}>Insurer</label><input name="insurer" required placeholder="AXA Mansard" className={input} /></div>
              <div><label className={label}>Policy number</label><input name="policy_number" placeholder="POL-2026-001" className={input} /></div>
              <div><label className={label}>Coverage</label><input name="coverage_type" placeholder="Comprehensive / Third Party" className={input} /></div>
              <div><label className={label}>Premium (₦)</label><input type="number" min="0" name="premium" className={input} /></div>
              <div><label className={label}>Start date</label><input type="date" name="start_date" className={input} /></div>
              <div><label className={label}>Expiry date</label><input type="date" name="expiry_date" className={input} /></div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Cancel</button>
              <button disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Save policy'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
