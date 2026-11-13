import Link from "next/link";

const sections = [
  { href: "/customer/dashboard/workspace/shipments", label: "Shipments", description: "Bookings, dispatch, tracking and delivery" },
  { href: "/customer/dashboard/workspace/customers", label: "Customers", description: "Customer records and account management" },
  { href: "/customer/dashboard/workspace/drivers", label: "Drivers", description: "Driver profiles and performance" },
  { href: "/customer/dashboard/workspace/fleet", label: "Fleet", description: "Vehicles, insurance and maintenance" },
  { href: "/customer/dashboard/workspace/warehouse", label: "Warehouse", description: "Inventory and stock management" },
  { href: "/customer/dashboard/workspace/finance", label: "Finance", description: "Invoices, expenses, purchase orders and finance" },
  { href: "/customer/dashboard/workspace/hr", label: "HR", description: "Employees, recruitment, leave and HR records" },
  { href: "/customer/dashboard/workspace/crm", label: "CRM & Leads", description: "Leads, assignments and follow-up" },
  { href: "/customer/dashboard/workspace/support", label: "Support", description: "Tickets, live chat and customer communications" },
  { href: "/customer/dashboard/workspace/reports", label: "Reports", description: "Operational and business reporting" },
  { href: "/customer/dashboard/workspace/calendar", label: "Calendar", description: "Calendar and scheduled events" },
  { href: "/customer/dashboard/workspace/clock-tracker", label: "Clock Tracker", description: "Staff time tracking" },
  { href: "/customer/dashboard/workspace/ai-chat", label: "AI Chat", description: "AI assistant workspace" }
];

export default function CustomerERPWorkspacePage() {
  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-red-400">JAAD Logistics</p>
            <h1 className="text-3xl font-bold tracking-tight">ERP Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Access your operational modules from one workspace.</p>
          </div>
          <Link href="/customer/dashboard" className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:border-red-500 hover:text-white">← Back to customer portal</Link>
        </div>
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm leading-6 text-zinc-300">
          <strong className="text-white">Customer workspace setup:</strong> these modules are ported from the admin app. Before enabling this workspace for real customer accounts, the database policies and queries must be tenant-scoped so each business can access only its own records.
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <Link key={section.href} href={section.href} className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-red-500/60 hover:bg-white/[0.06]">
              <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold text-white">{section.label}</h2><span className="text-red-400">→</span></div>
              <p className="text-sm leading-6 text-zinc-400">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
