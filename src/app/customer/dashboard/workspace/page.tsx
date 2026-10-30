import Link from 'next/link';
import { getCustomerTenantContext } from '@/lib/customer-tenant';
import { planAllowsModule, type CustomerModule } from '@/lib/billing/plans';

const sections: { key: CustomerModule | 'settings'; href: string; label: string; description: string; icon: string }[] = [
  { key: 'shipments', href: '/customer/dashboard/workspace/shipments', label: 'Shipment Operations', description: 'Bookings, dispatch, tracking and delivery', icon: '↗' },
  { key: 'customers', href: '/customer/dashboard/workspace/customers', label: 'Customer Management', description: 'Customer records, account details and contacts', icon: '◎' },
  { key: 'crm', href: '/customer/dashboard/workspace/crm', label: 'CRM & Leads', description: 'Manage leads and follow-ups; advanced CRM tools depend on your plan', icon: '◇' },
  { key: 'drivers', href: '/customer/dashboard/workspace/drivers', label: 'Driver Management', description: 'Driver profiles, duty status and performance', icon: '♧' },
  { key: 'fleet', href: '/customer/dashboard/workspace/fleet', label: 'Fleet Management', description: 'Vehicles, insurance and maintenance', icon: '▣' },
  { key: 'warehouse', href: '/customer/dashboard/workspace/warehouse', label: 'Warehouse', description: 'Inventory, SKUs and stock control', icon: '▤' },
  { key: 'finance', href: '/customer/dashboard/workspace/finance', label: 'Finance & Invoices', description: 'Invoices, expenses, payroll and purchasing', icon: '₦' },
  { key: 'hr', href: '/customer/dashboard/workspace/hr', label: 'HR & People', description: 'Employees, recruitment, leave and HR records', icon: '♙' },
  { key: 'support', href: '/customer/dashboard/workspace/support', label: 'Support & Communications', description: 'Tickets, live chat and customer communications', icon: '✉' },
  { key: 'reports', href: '/customer/dashboard/workspace/reports', label: 'Reports', description: 'Operational and business reporting', icon: '▥' },
  { key: 'calendar', href: '/customer/dashboard/workspace/calendar', label: 'Calendar', description: 'Meetings, events and schedules', icon: '▦' },
  { key: 'clock-tracker', href: '/customer/dashboard/workspace/clock-tracker', label: 'Clock Tracker', description: 'Staff time tracking and work sessions', icon: '◷' },
  { key: 'ai-chat', href: '/customer/dashboard/workspace/ai-chat', label: 'AI Assistant', description: 'AI workspace for supported business tasks', icon: '✧' },
  { key: 'settings', href: '/customer/dashboard/workspace/settings', label: 'Invoice Branding', description: 'Upload your logo and set your invoice company details', icon: '▧' },
];

export default async function CustomerERPWorkspacePage() {
  const tenant = await getCustomerTenantContext();
  const planCode = tenant?.planCode ?? 'basic';
  return <div className="space-y-6">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Workspace overview</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Welcome to your ERP</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">Your company workspace is separate from other JAAD customers. Use the modules below to manage your own operations, team and records.</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30"><p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">Current package</p><p className="mt-1 text-lg font-bold capitalize">{planCode}</p><p className="text-xs text-neutral-500">{tenant ? `Active until ${new Date(tenant.subscriptionEndsAt).toLocaleDateString()}` : 'Subscription required'}</p></div>
      </div>
      {!tenant?.fullCrmAccess && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/20"><p className="leading-6 text-amber-900 dark:text-amber-200">Your CRM is available in limited mode. The ₦20,000/month Premium package unlocks the complete CRM toolkit.</p><Link href="/packages" className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">View packages</Link></div>}
    </section>
    <section><div className="mb-3 flex items-end justify-between"><div><h3 className="text-base font-semibold">Your modules</h3><p className="mt-1 text-sm text-neutral-500">Modules are available according to your active subscription.</p></div><Link href="/customer/dashboard" className="text-sm font-semibold text-red-600 hover:underline">Customer portal</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sections.map((section) => { const allowed = section.key === 'settings' || planAllowsModule(planCode, section.key); return <Link key={section.href} href={allowed ? section.href : '/packages'} aria-disabled={!allowed} className={`group rounded-xl border bg-white p-4 transition dark:bg-neutral-900 ${allowed ? 'border-neutral-200 hover:border-red-400 hover:shadow-sm dark:border-neutral-800 dark:hover:border-red-700' : 'border-neutral-100 opacity-65 dark:border-neutral-800'}`}><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-lg font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">{section.icon}</span>{allowed ? <span className="text-sm text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-red-600">↗</span> : <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800">Upgrade</span>}</div><h4 className="mt-3 text-sm font-semibold">{section.label}</h4><p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{section.description}</p></Link>; })}</div>
    </section>
  </div>;
}
