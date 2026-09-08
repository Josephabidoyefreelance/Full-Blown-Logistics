'use client';

import { useState, useTransition } from 'react';
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
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(current));
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold hover:bg-neutral-50">
        Edit access
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-8">
      <div className="w-full max-w-sm rounded-xl bg-white p-6">
        <h3 className="mb-4 text-base font-semibold">Edit access, {roleName}</h3>
        <div className="mb-4 space-y-1.5">
          {ALL_MODULES.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked.has(m.key)}
                onChange={(e) => {
                  const next = new Set(checked);
                  if (e.target.checked) next.add(m.key);
                  else next.delete(m.key);
                  setChecked(next);
                }}
              />
              {m.label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await updateRolePermissions(roleId, Array.from(checked));
                setOpen(false);
              });
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Saving...' : 'Save access'}
          </button>
        </div>
      </div>
    </div>
  );
}
