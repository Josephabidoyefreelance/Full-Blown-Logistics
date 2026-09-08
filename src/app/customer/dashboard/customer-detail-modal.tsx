'use client';

import { useState, useTransition } from 'react';
import StatusSwitch from './status-switch';
import AssignedToSwitch from './assigned-to-switch';
import { updateCustomerDetails, deactivateCustomer, reactivateCustomer } from './actions';

type Staff = { id: string; full_name: string | null };

type Customer = {
  id: string;
  name: string;
  type: string;
  contact: string | null;
  credit_limit: number;
  balance: number | null;
  status: string;
  client_since: string | null;
  assigned_to?: string | null;
  currency?: string | null;
  tax_rate?: number | null;
  deactivation_reason?: string | null;
  deactivated_at?: string | null;
  deactivated_by?: string | null;
};

const CURRENCY_OPTIONS = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD'];

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

function EditField({
  label,
  name,
  defaultValue,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      />
    </div>
  );
}

export default function CustomerDetailTrigger({ customer, staff }: { customer: Customer; staff: Staff[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeactivatePrompt, setShowDeactivatePrompt] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  function close() {
    setOpen(false);
    setEditing(false);
    setShowDeactivatePrompt(false);
    setDeactivateReason('');
    setError(null);
  }

  function handleDeactivate() {
    if (!deactivateReason.trim()) {
      setError('A reason is required to deactivate this account.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deactivateCustomer(customer.id, deactivateReason, 'Admin');
      if (res?.error) setError(res.error);
      else {
        setShowDeactivatePrompt(false);
        setDeactivateReason('');
      }
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const res = await reactivateCustomer(customer.id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="truncate text-left font-medium text-neutral-900 hover:text-red-600 hover:underline dark:text-neutral-100"
      >
        {customer.name}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-8"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
          >
            <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Account
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{customer.name}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-white dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Edit
                    </button>
                  )}
                  <button onClick={close} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                    Close
                  </button>
                </div>
              </div>
            </div>

            {!editing ? (
              <div className="px-6 py-5">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Type" value={customer.type} />
                  <Field label="Contact" value={customer.contact || '—'} />
                  <Field label="Credit limit" value={nairaFmt(customer.credit_limit)} />
                  <Field label="Balance" value={customer.balance ? nairaFmt(customer.balance) : '—'} />
                  <Field label="Client since" value={customer.client_since || '—'} />
                  <Field label="Currency" value={customer.currency || 'NGN'} />
                  <Field label="Tax rate" value={`${customer.tax_rate ?? 7.5}%`} />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      Assigned to
                    </dt>
                    <dd className="mt-1">
                      <AssignedToSwitch id={customer.id} assignedTo={customer.assigned_to ?? null} staff={staff} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <StatusSwitch id={customer.id} status={customer.status} />
                    </dd>
                  </div>
                </dl>

                {customer.status === 'Inactive' ? (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                      Account deactivated
                    </div>
                    <div className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                      {customer.deactivation_reason || 'No reason on file.'}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {customer.deactivated_at ? new Date(customer.deactivated_at).toLocaleString() : ''}
                      {customer.deactivated_by ? ` \u00b7 by ${customer.deactivated_by}` : ''}
                    </div>
                    <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                      Full account record is retained, not deleted, for regulatory record-keeping.
                    </p>
                    <button
                      onClick={handleReactivate}
                      disabled={isPending}
                      className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-white disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {isPending ? 'Reactivating...' : 'Reactivate account'}
                    </button>
                  </div>
                ) : !showDeactivatePrompt ? (
                  <div className="mt-5">
                    <button
                      onClick={() => setShowDeactivatePrompt(true)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Deactivate account
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Reason for deactivation (required)
                    </label>
                    <textarea
                      value={deactivateReason}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                    <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      This does not delete the account. The full record stays on file for regulatory retention.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => { setShowDeactivatePrompt(false); setDeactivateReason(''); }}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeactivate}
                        disabled={isPending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {isPending ? 'Deactivating...' : 'Confirm deactivation'}
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>
            ) : (
              <form
                action={(fd) => {
                  setError(null);
                  startTransition(async () => {
                    const res = await updateCustomerDetails(customer.id, fd);
                    if (res?.error) setError(res.error);
                    else setEditing(false);
                  });
                }}
                className="px-6 py-5"
              >
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Account name" name="name" defaultValue={customer.name} />
                  <EditField label="Type" name="type" defaultValue={customer.type} />
                  <EditField label="Contact" name="contact" defaultValue={customer.contact ?? ''} />
                  <EditField
                    label="Credit limit, NGN"
                    name="credit_limit"
                    defaultValue={String(customer.credit_limit ?? '')}
                    type="number"
                  />
                  <EditField
                    label="Balance, NGN"
                    name="balance"
                    defaultValue={String(customer.balance ?? '')}
                    type="number"
                  />
                  <EditField label="Client since" name="client_since" defaultValue={customer.client_since ?? ''} />
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">Currency</label>
                    <select
                      name="currency"
                      defaultValue={customer.currency ?? 'NGN'}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <EditField
                    label="Tax rate, %"
                    name="tax_rate"
                    defaultValue={String(customer.tax_rate ?? 7.5)}
                    type="number"
                  />
                </div>

                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
