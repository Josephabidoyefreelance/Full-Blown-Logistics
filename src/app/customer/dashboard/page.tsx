import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCustomerBillingWorkspace } from '@/lib/customer-billing-workspace';

export const dynamic = 'force-dynamic';

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/customer/login');

  const billing = await getCustomerBillingWorkspace();
  if (!billing) redirect('/customer/dashboard/select-workspace');
  const company = billing.company;
  const { data: subscription } = await supabase
    .from('company_subscriptions').select('plan_code,status,current_period_end')
    .eq('company_id', company.id).maybeSingle();
  const status = String(subscription?.status ?? 'inactive').toLowerCase();
  const expiry = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const valid = !!expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now()
    && ['active', 'trial', 'trialing'].includes(status);
  const workspaceReady = process.env.CUSTOMER_ERP_TENANT_MODE === 'enabled';

  return <section className="mx-auto max-w-6xl space-y-6">
    <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Welcome to {company?.name ?? 'your company'} workspace.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-neutral-300 p-5 dark:border-neutral-700"><p className="text-sm text-neutral-500 dark:text-neutral-400">Company</p><p className="mt-2 font-semibold">{company?.name ?? 'Company workspace'}</p></div>
      <div className="rounded-xl border border-neutral-300 p-5 dark:border-neutral-700"><p className="text-sm text-neutral-500 dark:text-neutral-400">Plan</p><p className="mt-2 font-semibold capitalize">{subscription?.plan_code ?? 'Not provisioned'}</p></div>
      <div className="rounded-xl border border-neutral-300 p-5 dark:border-neutral-700"><p className="text-sm text-neutral-500 dark:text-neutral-400">Subscription</p><p className="mt-2 font-semibold">{valid ? (['trial', 'trialing'].includes(status) ? 'Trial active' : 'Active') : 'Inactive or expired'}</p>{expiry && !Number.isNaN(expiry.getTime()) && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Ends {expiry.toLocaleDateString('en-GB', {timeZone:'UTC'})}</p>}</div>
    </div>
    <div className="rounded-xl border border-neutral-300 p-5 dark:border-neutral-700"><h2 className="font-semibold">Your ERP workspace</h2>
      {valid && workspaceReady ? <><p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Open your authorized operational modules from the navigation menu.</p><Link className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" href="/customer/dashboard/workspace">Open workspace</Link></> : <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{!valid ? 'Your subscription or trial is not currently active. Review your plan to continue.' : 'Your subscription is active. Some operational modules remain temporarily restricted while company-level access controls are verified.'}</p>}
      <div className="mt-4"><Link href="/customer/dashboard/packages" className="text-sm font-medium text-red-500 underline">View subscription details</Link></div>
    </div>
  </section>;
}
