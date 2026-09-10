import { createClient } from '@/lib/supabase/server';
import StatusSwitch from './status-switch';
import AssignedToSwitch from './assigned-to-switch';
import NewAccountForm from './new-account-form';
import ExportCustomersButton from './export-customers-button';
import ImportFromLeadsButton from './import-from-leads-button';
import CustomerDetailTrigger from './customer-detail-modal';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default async function CustomersPage() {
  const supabase = await createClient();

  const [{ data: customers, error }, { data: staff }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, type, contact, credit_limit, balance, status, client_since, assigned_to, currency, tax_rate')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Customer Management</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Accounts, contracts, documents and credit exposure.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCustomersButton customers={customers ?? []} />
          <ImportFromLeadsButton />
          <NewAccountForm staff={staff ?? []} />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">Could not load customers: {error.message}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(0,1.9fr)_90px_minmax(0,1.3fr)_130px_110px_80px_170px_105px] items-center gap-x-6 bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            <div>Account</div>
            <div>Type</div>
            <div>Contact</div>
            <div>Credit limit</div>
            <div>Balance</div>
            <div>Since</div>
            <div>Assigned to</div>
            <div>Status</div>
          </div>

          {(customers ?? []).map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[minmax(0,1.9fr)_90px_minmax(0,1.3fr)_130px_110px_80px_170px_105px] items-center gap-x-6 border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
            >
              <CustomerDetailTrigger customer={c} staff={staff ?? []} />
              <div className="text-neutral-700 dark:text-neutral-300">{c.type}</div>
              <div className="truncate text-neutral-700 dark:text-neutral-300">{c.contact}</div>
              <div className="text-neutral-900 dark:text-neutral-100">{nairaFmt(c.credit_limit)}</div>
              <div className="text-neutral-900 dark:text-neutral-100">
                {c.balance ? nairaFmt(c.balance) : '\u2014'}
              </div>
              <div className="text-neutral-700 dark:text-neutral-300">{c.client_since}</div>
              <AssignedToSwitch id={c.id} assignedTo={c.assigned_to ?? null} staff={staff ?? []} />
              <div>
                <StatusSwitch id={c.id} status={c.status} />
              </div>
            </div>
          ))}

          {!customers?.length && !error && (
            <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">No customers yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
