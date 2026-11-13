'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRolePermissions } from './actions';

const ALL_MODULES: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'crm', label: 'CRM & Leads' },
  { key: 'customers', label: 'Customer Management' },
  { key: 'shipments', label: 'Shipment Operations' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'drivers', label: 'Driver Management' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'HR & Careers' },
  { key: 'support', label: 'Support' },
  { key: 'reports', label: 'Reports' },
  { key: 'admin', label: 'Administration' },
];

export default function EditRoleAccess({
  roleId,
  roleName,
  current,
}: {
  roleId: string;
  roleName: string;
  current: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(current));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackIsWarning, setFeedbackIsWarning] = useState(false);

  function openEditor() {
    setChecked(new Set(current));
    setError('');
    setFeedback('');
    setOpen(true);
  }

  function closeEditor() {
    if (isPending) return;
    setOpen(false);
    setError('');
  }

  function save() {
    setError('');
    startTransition(async () => {
      try {
        const result = await updateRolePermissions(roleId, Array.from(checked));
        if (result?.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setFeedbackIsWarning(Boolean(result?.warning));
        setFeedback(result?.warning || 'Role access saved.');
        router.refresh();
      } catch {
        setError('Role access could not be saved. Check your connection and retry.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button type="button" onClick={openEditor} className="inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800">
        Edit access
      </button>
      {feedback && <p role="status" className={`max-w-[220px] text-right text-xs ${feedbackIsWarning ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>{feedback}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`edit-role-title-${roleId}`} className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Role permissions</p>
                <h2 id={`edit-role-title-${roleId}`} className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Edit access: {roleName}</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Select the ERP modules this role may access.</p>
              </div>
              <button type="button" onClick={closeEditor} disabled={isPending} aria-label="Close role access dialog" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800">✕</button>
            </header>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ALL_MODULES.map((module) => (
                <label key={module.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800/70">
                  <input
                    type="checkbox"
                    checked={checked.has(module.key)}
                    onChange={(event) => {
                      const next = new Set(checked);
                      if (event.target.checked) next.add(module.key);
                      else next.delete(module.key);
                      setChecked(next);
                    }}
                    className="h-4 w-4 shrink-0 accent-red-600"
                  />
                  <span className="min-w-0 flex-1">{module.label}</span>
                  <span className={`text-[10px] font-semibold ${checked.has(module.key) ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`}>{checked.has(module.key) ? 'Granted' : 'Not granted'}</span>
                </label>
              ))}
            </div>

            {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{checked.size} of {ALL_MODULES.length} modules selected</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={closeEditor} disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
                <button type="button" onClick={save} disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Saving…' : 'Save access'}</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
