'use client';

import { useState, useTransition } from 'react';
import { getVehicleMaintenanceHistory } from './actions';

type Vehicle = { id: string; plate: string };
type Record = { id: string; description: string; cost: number | null; service_date: string | null; status: string };

export default function MaintenanceRecordsButton({ vehicles }: { vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [records, setRecords] = useState<Record[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPlate = vehicles.find((v) => v.id === vehicleId)?.plate ?? '';

  function handleVehicleChange(id: string) {
    setVehicleId(id);
    setRecords(null);
    setError(null);
    if (!id) return;
    startTransition(async () => {
      const res = await getVehicleMaintenanceHistory(id);
      if (res.error) setError(res.error);
      else setRecords(res.records as Record[]);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Records
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-8 print:bg-white">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .finance-print-area, .finance-print-area * { visibility: visible; }
              .finance-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
            }
          `}</style>
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 print:hidden dark:border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Vehicle maintenance records
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="finance-print-area p-6">
              <div className="mb-4 print:hidden">
                <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Vehicle
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlate && (
                <h3 className="mb-4 text-lg font-bold text-neutral-900">
                  Maintenance history — {selectedPlate}
                </h3>
              )}

              {isPending && <p className="text-sm text-neutral-400">Loading...</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}

              {records && (
                <div className="overflow-hidden rounded-lg border border-neutral-200">
                  <div className="grid grid-cols-[110px_1fr_110px_110px] bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                    <div>Date</div>
                    <div>Description</div>
                    <div>Cost</div>
                    <div>Status</div>
                  </div>
                  {records.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-[110px_1fr_110px_110px] border-t border-neutral-100 px-4 py-2 text-sm"
                    >
                      <div className="text-neutral-700">{r.service_date ?? '\u2014'}</div>
                      <div className="text-neutral-700">{r.description}</div>
                      <div className="text-neutral-700">
                        {r.cost ? `\u20a6${Number(r.cost).toLocaleString()}` : '\u2014'}
                      </div>
                      <div className="text-neutral-700">{r.status}</div>
                    </div>
                  ))}
                  {!records.length && (
                    <div className="px-4 py-6 text-center text-sm text-neutral-400">
                      No maintenance records for this vehicle yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4 print:hidden dark:border-neutral-800">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                disabled={!records || !records.length}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
