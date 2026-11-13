'use client';

import { useState, useTransition } from 'react';
import { getVehicleMaintenanceHistory } from './actions';

type Vehicle = { id: string; plate: string; type?: string };
type RecordRow = { id: string; description: string; cost: number | null; service_date: string | null; status: string };

function money(value: number | null) {
  return value == null ? '—' : `₦${Number(value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function MaintenanceRecordsButton({ vehicles }: { vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [records, setRecords] = useState<RecordRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = vehicles.find((v) => v.id === vehicleId);

  function load(id: string) {
    setVehicleId(id);
    setRecords(null);
    setError(null);
    if (!id) return;
    startTransition(async () => {
      const result = await getVehicleMaintenanceHistory(id);
      if (result.error) setError(result.error);
      else setRecords(result.records as RecordRow[]);
    });
  }

  function downloadRecord() {
    if (!selected || !records) return;

    const rows = records.map((r) => `
      <tr>
        <td>${r.service_date ?? ''}</td>
        <td>${r.description.replace(/</g, '&lt;')}</td>
        <td>${money(r.cost)}</td>
        <td>${r.status}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fleet Maintenance Record - ${selected.plate}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#222}h1{margin-bottom:4px}p{color:#666}
        table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ddd;padding:10px;text-align:left}
        th{background:#f5f5f5;font-size:12px;text-transform:uppercase}footer{margin-top:30px;color:#888;font-size:11px}
      </style></head><body>
      <h1>JAAD ERP — Fleet Maintenance Record</h1>
      <p><strong>Vehicle:</strong> ${selected.plate} &nbsp; <strong>Type:</strong> ${selected.type ?? ''}</p>
      <table><thead><tr><th>Date</th><th>Work / Description</th><th>Cost</th><th>Status</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No maintenance records.</td></tr>'}</tbody></table>
      <footer>Generated from JAAD ERP Fleet Management.</footer>
      </body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JAAD-${selected.plate}-maintenance-record.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Records</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Fleet records</p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Vehicle maintenance history</h2>
                <p className="text-xs text-neutral-500">Open a vehicle record, print it or download a copy for your files.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-neutral-400">✕</button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={vehicleId} onChange={e => load(e.target.value)} className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                <option value="">Select a vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}{v.type ? ` — ${v.type}` : ''}</option>)}
              </select>
              <button disabled={!records} onClick={() => window.print()} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-neutral-700">Print</button>
              <button disabled={!records} onClick={downloadRecord} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Download</button>
            </div>

            {pending && <p className="mt-5 text-sm text-neutral-500">Loading vehicle record…</p>}
            {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

            {records && (
              <div id="maintenance-record-print-area" className="mt-5">
                <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Vehicle</p>
                      <p className="mt-1 font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">{selected?.plate}</p>
                      <p className="text-xs text-neutral-500">{selected?.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Records</p>
                      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{records.length}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60">
                      <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Work / Description</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Status</th></tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                          <td className="px-4 py-3">{r.service_date ?? '—'}</td>
                          <td className="px-4 py-3 font-medium">{r.description}</td>
                          <td className="px-4 py-3">{money(r.cost)}</td>
                          <td className="px-4 py-3">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!records.length && <p className="p-8 text-center text-sm text-neutral-400">No records for this vehicle.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
