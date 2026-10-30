'use client';

import { useState } from 'react';
import { updateVehicleDetails } from './actions';

type Vehicle = {
  id: string;
  plate: string;
  type: string;
  next_service_date: string | null;
  insurer: string | null;
};

type Trigger = 'service' | 'insurance' | 'both';

const input = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export default function EditVehicleDetails({ vehicle, trigger = 'both' }: { vehicle: Vehicle; trigger?: Trigger }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = trigger === 'service'
    ? 'Update next service date'
    : trigger === 'insurance'
      ? 'Update insurance company'
      : 'Edit vehicle details';

  async function save(formData: FormData) {
    setSaving(true);
    setError(null);
    formData.set('id', vehicle.id);

    try {
      const result = await updateVehicleDetails(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this vehicle record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpen(true); }}
        className="text-left font-medium text-neutral-700 underline decoration-dotted underline-offset-2 hover:text-red-600 dark:text-neutral-200"
      >
        {trigger === 'service'
          ? (vehicle.next_service_date || 'Set date')
          : trigger === 'insurance'
            ? (vehicle.insurer || 'Add insurer')
            : 'Edit details'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/95 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Vehicle record</p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
                <p className="text-xs text-neutral-500">Only this vehicle: <strong>{vehicle.plate}</strong> · {vehicle.type}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">✕</button>
            </div>

            {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save(new FormData(event.currentTarget));
              }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={vehicle.id} />

              {trigger !== 'insurance' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Next service date</label>
                  <input type="date" name="next_service_date" defaultValue={vehicle.next_service_date ?? ''} className={input} />
                  <p className="mt-1 text-[10px] text-neutral-400">This date drives the service due and overdue warning on this vehicle.</p>
                </div>
              )}

              {trigger !== 'service' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Insurance company</label>
                  <input
                    name="insurer"
                    defaultValue={vehicle.insurer ?? ''}
                    placeholder="e.g. AXA Mansard"
                    className={input}
                    autoFocus={trigger === 'insurance'}
                  />
                  <p className="mt-1 text-[10px] text-neutral-400">This updates only {vehicle.plate}.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">Cancel</button>
                <button disabled={saving} type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
