import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerTenantContext } from '@/lib/customer-tenant';

export const dynamic = 'force-dynamic';

const links = [
  ['Dashboard', '/customer/dashboard/workspace'],
  ['Shipments', '/customer/dashboard/workspace/shipments'],
  ['Customers', '/customer/dashboard/workspace/customers'],
  ['Drivers', '/customer/dashboard/workspace/drivers'],
  ['Fleet', '/customer/dashboard/workspace/fleet'],
  ['Warehouse', '/customer/dashboard/workspace/warehouse'],
  ['Finance', '/customer/dashboard/workspace/finance'],
  ['HR', '/customer/dashboard/workspace/hr'],
  ['CRM & Leads', '/customer/dashboard/workspace/crm'],
  ['Support', '/customer/dashboard/workspace/support'],
  ['Reports', '/customer/dashboard/workspace/reports'],
  ['Calendar', '/customer/dashboard/workspace/calendar'],
  ['Clock Tracker', '/customer/dashboard/workspace/clock-tracker'],
  ['AI Assistant', '/customer/dashboard/workspace/ai-chat'],
  ['Invoice Branding', '/customer/dashboard/workspace/settings'],
] as const;

function SetupNotice({ title, body }: { title: string; body: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white"><section className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-white/[0.03] p-7"><p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">JAAD Logistics</p><h1 className="mt-3 text-2xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p><Link href="/packages" className="mt-6 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm hover:border-red-400">View packages / contact JAAD</Link></section></main>;
}

export default async function CustomerWorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== 'enabled') {
    return <SetupNotice title="Customer ERP security setup is not complete" body="The tenant migration must be applied and tested before this workspace can open. This lock prevents customer accounts from accessing unscoped company records. Do not enable CUSTOMER_ERP_TENANT_MODE until the isolation checklist in the supplied docs passes." />;
  }
  const context = await getCustomerTenantContext();
  if (!context) {
    return <SetupNotice title="An active company subscription is required" body="This account must be linked to a company workspace with a verified, active subscription. Open Packages or contact JAAD support if your company has already paid." />;
  }

  return <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">JAAD Logistics ERP</p><h1 className="mt-1 text-lg font-semibold">{context.companyName}</h1><p className="text-xs text-neutral-500">{context.planCode.toUpperCase()} plan · active until {new Date(context.subscriptionEndsAt).toLocaleDateString()}</p></div>
        <div className="flex flex-wrap gap-2"><Link className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-red-500 dark:border-neutral-700" href="/customer/dashboard">Customer portal</Link><Link className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700" href="/packages">Manage subscription</Link></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Workspace</p>
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">{links.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-neutral-700 transition hover:bg-red-50 hover:text-red-700 dark:text-neutral-300 dark:hover:bg-red-950/30 dark:hover:text-red-300">{label}</Link>)}</nav>
        {!context.fullCrmAccess && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">CRM is in limited mode on your plan. Upgrade to ₦20,000/month for full CRM access.</p>}
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
