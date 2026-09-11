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
      .select('id, name, type, contact, credit_limit, balance, status, client_since, assigned_to')
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
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <th className="w-[20%] px-4 py-2.5 font-medium">Account</th>
              <th className="w-[7%] px-4 py-2.5 font-medium">Type</th>
              <th className="w-[16%] px-4 py-2.5 font-medium">Contact</th>
              <th className="w-[12%] px-4 py-2.5 font-medium">Credit limit</th>
              <th className="w-[11%] px-4 py-2.5 font-medium">Balance</th>
              <th className="w-[7%] px-4 py-2.5 font-medium">Since</th>
              <th className="w-[15%] px-4 py-2.5 font-medium">Assigned to</th>
              <th className="w-[12%] px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="truncate px-4 py-2.5">
                  <CustomerDetailTrigger customer={c} staff={staff ?? []} />
                </td>
                <td className="truncate px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{c.type}</td>
                <td className="truncate px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{c.contact}</td>
                <td className="truncate px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                  {nairaFmt(c.credit_limit)}
                </td>
                <td className="truncate px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                  {c.balance ? nairaFmt(c.balance) : '\u2014'}
                </td>
                <td className="truncate px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{c.client_since}</td>
                <td className="px-4 py-2.5">
                  <AssignedToSwitch id={c.id} assignedTo={c.assigned_to ?? null} staff={staff ?? []} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusSwitch id={c.id} status={c.status} />
                </td>
              </tr>
            ))}

            {!customers?.length && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
