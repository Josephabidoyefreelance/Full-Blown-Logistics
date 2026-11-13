import { requireAdminContext } from '@/lib/admin-security';

/** Read-only billing review. Never permits customer workspace access. */
export default async function SubscriptionReview() {
  const result = await requireAdminContext(['Super Admin']);
  if (!result.ok) {
    return <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-red-700 dark:border-neutral-800 dark:bg-neutral-900">Access denied. Subscription administration requires a verified JAAD Super Admin account.</div>;
  }
  const { admin } = result.context;
  const [subscriptions, companies, payments] = await Promise.all([
    admin.from('company_subscriptions').select('company_id,plan_code,status,current_period_end').limit(200),
    admin.from('companies').select('id,name').limit(200),
    admin.from('billing_payment_attempts').select('id,company_id,plan_code,amount_kobo,reference,status').order('id',{ascending:false}).limit(100),
  ]);
  const problem = subscriptions.error || companies.error || payments.error;
  if (problem) return <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-red-700 dark:border-neutral-800 dark:bg-neutral-900">Billing records cannot be loaded: {problem.message}. Verify the live database schema before enabling activation.</div>;
  const names = new Map((companies.data || []).map(c => [c.id, c.name]));
  return <section className="space-y-3">
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Customer subscriptions</h2>
      <p className="mt-1 text-xs text-neutral-500">Read-only review. Manual activation is intentionally disabled until payment verification, database constraints and audit logging are confirmed.</p>
    </div>
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <table className="min-w-[760px] w-full text-left text-xs"><thead><tr className="text-neutral-500"><th className="p-3">Company</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Expires</th></tr></thead><tbody>
        {(subscriptions.data || []).map(s => <tr key={s.company_id} className="border-t border-neutral-100 dark:border-neutral-800"><td className="p-3">{names.get(s.company_id) || s.company_id}</td><td className="p-3">{s.plan_code}</td><td className="p-3">{s.status}</td><td className="p-3">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('en-GB') : '—'}</td></tr>)}
      </tbody></table>{!subscriptions.data?.length && <p className="p-4 text-xs text-neutral-500">No subscription records found.</p>}
    </div>
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold">Recent payment attempts</h3><div className="mt-3 overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead><tr className="text-neutral-500"><th className="p-2">Company</th><th className="p-2">Package</th><th className="p-2">Amount</th><th className="p-2">Reference</th><th className="p-2">Status</th></tr></thead><tbody>{(payments.data || []).map(p => <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800"><td className="p-2">{names.get(p.company_id) || p.company_id}</td><td className="p-2">{p.plan_code}</td><td className="p-2">₦{(Number(p.amount_kobo)/100).toLocaleString('en-NG')}</td><td className="p-2">{p.reference}</td><td className="p-2">{p.status}</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
