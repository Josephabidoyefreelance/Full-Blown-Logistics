import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DarkModeToggle from '@/components/dark-mode-toggle';
import SoundToggle from '@/components/sound-toggle';
import ProfileMenu from '@/components/profile-menu';
import CustomerSignOutButton from './customer-sign-out-button';
import CustomerDigitalClock from './customer-digital-clock';
import { getCustomerBillingWorkspace } from '@/lib/customer-billing-workspace';
import { CustomerWorkspacePreferencesProvider } from '@/components/customer-workspace-preferences';
import CustomerSidebarLogo from './customer-sidebar-logo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Item = { label: string; href: string; icon: string };
type Group = { title: string; items: Item[] };
const GROUPS: Group[] = [
 { title: 'OVERVIEW', items: [{label:'Dashboard',href:'/customer/dashboard?view=overview',icon:'dashboard'}] },
 { title: 'REVENUE & CLIENTS', items: [
   {label:'CRM & Leads',href:'/customer/dashboard/workspace/crm',icon:'crm'},
   {label:'Customer Management',href:'/customer/dashboard/workspace/customers',icon:'customers'},
 ]},
 { title: 'OPERATIONS', items: [
   {label:'Shipment Operations',href:'/customer/dashboard/workspace/shipments',icon:'shipments'},
   {label:'Fleet',href:'/customer/dashboard/workspace/fleet',icon:'fleet'},
   {label:'Driver Management',href:'/customer/dashboard/workspace/drivers',icon:'drivers'},
   {label:'Warehouse',href:'/customer/dashboard/workspace/warehouse',icon:'warehouse'},
 ]},
 { title: 'FINANCE & PEOPLE', items: [
   {label:'Finance',href:'/customer/dashboard/workspace/finance',icon:'finance'},
   {label:'Packages',href:'/customer/dashboard/packages',icon:'packages'},
   {label:'HR & Careers',href:'/customer/dashboard/workspace/hr',icon:'hr'},
 ]},
 { title: 'SERVICE & INSIGHT', items: [
   {label:'Reports',href:'/customer/dashboard/workspace/reports',icon:'reports'},
   {label:'Clock Tracker',href:'/customer/dashboard/workspace/clock-tracker',icon:'clock'},
   {label:'Calendar',href:'/customer/dashboard/workspace/calendar',icon:'calendar'},
   {label:'AI Assistant',href:'/customer/dashboard/workspace/ai-chat',icon:'ai'},
 ]},
];
const SUPPORT_ITEMS: Item[] = [
 {label:'Live Chat',href:'/customer/dashboard/workspace/support?view=livechat',icon:'chat'},
 {label:'Email',href:'/customer/dashboard/workspace/support?view=email',icon:'email'},
 {label:'SMS',href:'/customer/dashboard/workspace/support?view=sms',icon:'sms'},
 {label:'Call',href:'/customer/dashboard/workspace/support?view=call',icon:'call'},
 {label:'WhatsApp',href:'/customer/dashboard/workspace/support?view=whatsapp',icon:'whatsapp'},
];
function Icon({ name }: { name: string }) {
 const paths: Record<string, React.ReactNode> = {
  dashboard:<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  crm:<><path d="M4 19v-1.5A3.5 3.5 0 0 1 7.5 14h2A3.5 3.5 0 0 1 13 17.5V19"/><circle cx="8.5" cy="7.5" r="3"/><path d="M16 11a3 3 0 1 0-1-5.8M16 14h1a3 3 0 0 1 3 3v2"/></>,
  customers:<><circle cx="9" cy="8" r="3"/><path d="M3 20c.4-3.3 2.4-5 6-5s5.6 1.7 6 5M17 5.5a3 3 0 0 1 0 5.8M18 15c1.8.5 2.8 2.1 3 5"/></>,
  shipments:<><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z"/><path d="M3 7.5V17l9 4 9-4V7.5M12 12v9"/></>,
  fleet:<><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  drivers:<><circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M18 4l2 2-2 2"/></>,
  warehouse:<><path d="m3 10 9-6 9 6v10H3zM7 20v-6h10v6M7 10h10"/></>,
  finance:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 14h4"/></>,
  packages:<><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/></>,
  admin:<><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
  hr:<><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M4 5l2-2M20 5l-2-2"/></>,
  support:<><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13H3v4h4v-4H4ZM20 13h1v4h-4v-4h3ZM17 20h-5"/></>,
  reports:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/></>,
  ai:<><path d="M12 3 14 9l6 3-6 2-2 7-2-7-6-2 6-3 2-6Z"/></>,
  chat:<><path d="M4 5h16v11H9l-5 4V5Z"/></>, email:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  sms:<><path d="M4 4h16v13H9l-5 3V4Z"/><path d="M8 9h8M8 12h5"/></>,
  call:<><path d="M6 3h4l2 5-3 2a15 15 0 0 0 5 5l2-3 5 2v4c0 1-1 2-2 2C10 20 4 14 4 5c0-1 1-2 2-2Z"/></>,
  whatsapp:<><path d="M20 11a8 8 0 0 1-12 7L4 19l1-4a8 8 0 1 1 15-4Z"/><path d="M9 8c1 3 2 4 5 5"/></>,
 };
 return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.dashboard}</svg>;
}
const ICON_TONE: Record<string, string> = {
 dashboard: 'text-violet-400', crm: 'text-amber-400', customers: 'text-sky-400',
 shipments: 'text-emerald-400', fleet: 'text-orange-400', drivers: 'text-violet-400',
 warehouse: 'text-teal-400', finance: 'text-emerald-400', packages: 'text-teal-400',
 hr: 'text-pink-400', support: 'text-red-400', reports: 'text-blue-400',
 clock: 'text-amber-400', calendar: 'text-violet-400', ai: 'text-cyan-400',
 chat: 'text-emerald-400', email: 'text-blue-400', sms: 'text-violet-400',
 call: 'text-amber-400', whatsapp: 'text-emerald-400', admin: 'text-slate-300',
};
function NavItem({ item, compact = false }: { item: Item; compact?: boolean }) {
 return <Link href={item.href} className={`group flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-red-500 ${compact ? 'ml-5 min-h-7 text-[10px]' : ''}`}>
   <span className={`grid h-5 w-5 shrink-0 place-items-center rounded ${compact ? 'bg-neutral-100 dark:bg-neutral-900' : 'bg-neutral-100 dark:bg-neutral-900'} ${ICON_TONE[item.icon] ?? 'text-neutral-300'} group-hover:text-red-400`}><Icon name={item.icon}/></span>
   <span className="min-w-0 flex-1 truncate">{item.label}</span>
 </Link>;
}
export default async function CustomerErpLayout({ children }: { children: React.ReactNode }) {
 const supabase = await createClient();
 const { data: { user }, error: authError } = await supabase.auth.getUser();
 if (authError || !user) redirect('/customer/login');
 const { data: profile } = await supabase.from('profiles').select('full_name,email,avatar_url,roles(name)').eq('id',user.id).maybeSingle();
 const roleJoin = profile?.roles; const role = Array.isArray(roleJoin) ? roleJoin[0] : roleJoin;
 const displayFromAuth = [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ').trim();
 const name = profile?.full_name?.trim() || displayFromAuth || user.user_metadata?.full_name || user.email || 'Company member';

 // The customer workspace is resolved from authenticated owner/staff membership,
 // never from the ADMIN profile's company_id or an unverified legacy contact.
 const selectedWorkspace = await getCustomerBillingWorkspace();
 const companyName = selectedWorkspace?.company.name || 'Select customer workspace';
 const logoPrefix = selectedWorkspace && process.env.NEXT_PUBLIC_SUPABASE_URL
   ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/logos/${selectedWorkspace.company.id}/`
   : null;
 const memberName = displayFromAuth || user.user_metadata?.full_name || user.email || 'Company member';
 return <div className="jaad-customer-theme flex h-screen min-h-0 overflow-hidden bg-neutral-100 text-neutral-900 dark:bg-[#0b0b0d] dark:text-[#f8fafc] print:bg-white">
  <style>{`
    .dark .jaad-customer-theme .text-neutral-300 { color: #d1d5db !important; }
    .dark .jaad-customer-theme .text-neutral-400 { color: #cbd5e1 !important; }
    .dark .jaad-customer-theme .text-neutral-500 { color: #aebccc !important; }
    .dark .jaad-customer-theme .text-neutral-600 { color: #9aa8b8 !important; }
    .dark .jaad-customer-theme .text-neutral-700 { color: #d1d5db !important; }
    .dark .jaad-customer-theme input, .dark .jaad-customer-theme select, .dark .jaad-customer-theme textarea { color: #f8fafc; color-scheme: dark; }
    .dark .jaad-customer-theme input::placeholder, .dark .jaad-customer-theme textarea::placeholder { color: #94a3b8; opacity: 1; }
    .dark .jaad-customer-theme a:focus-visible, .dark .jaad-customer-theme button:focus-visible { outline-color: #f87171; }
  `}</style>
  <aside className="flex w-64 flex-shrink-0 flex-col border-r border-neutral-200 bg-white text-neutral-700 print:hidden dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
   <Link href="/customer/dashboard?view=overview" className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-4 dark:border-neutral-800">
    <CustomerSidebarLogo companyId={selectedWorkspace?.company.id ?? null} companyName={companyName} logoUrl={null} allowedPrefix={logoPrefix} />
    <span className="min-w-0"><span className="block truncate text-[11px] font-bold text-neutral-900 dark:text-white">{memberName}</span><span className="block truncate text-[9px] font-medium text-neutral-500 dark:text-neutral-300" title={companyName}>{companyName}</span></span>
   </Link>
   <nav aria-label="Customer ERP navigation" className="jaad-customer-scroll flex-1 overflow-y-auto px-1.5 py-2">
    <style>{`.jaad-customer-scroll::-webkit-scrollbar{width:8px}.jaad-customer-scroll::-webkit-scrollbar-track{background:transparent}.jaad-customer-scroll::-webkit-scrollbar-thumb{background:#dc2626!important;border-radius:9999px}.jaad-customer-scroll::-webkit-scrollbar-thumb:hover{background:#ef4444!important}.jaad-customer-scroll{scrollbar-color:#dc2626 transparent;scrollbar-width:thin}`}</style>
    {GROUPS.map(group=><div key={group.title} className="mb-3"><p className="px-2 pb-1.5 pt-2 text-[8px] font-semibold tracking-[0.12em] text-neutral-400">{group.title}</p><div className="space-y-0.5">{group.items.map(item=><NavItem key={item.label} item={item}/>)}{group.title==='SERVICE & INSIGHT' && <details className="group/support" open><summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-red-500"><span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-neutral-900 text-red-400"><Icon name="support"/></span><span className="flex-1">Support</span><span className="text-[10px] text-neutral-400 transition group-open/support:rotate-180">▾</span></summary><div className="mt-1 space-y-0.5 border-l border-neutral-200 pl-1 dark:border-neutral-700">{SUPPORT_ITEMS.map(item=><NavItem key={item.label} item={item} compact/>)}</div></details>}{group.title==='SERVICE & INSIGHT' && <NavItem item={{label:'Administrator Access',href:'/customer/dashboard/role-access',icon:'admin'}}/>}</div></div>)}
   </nav>
   <div className="shrink-0 border-t border-neutral-200 px-3 py-2.5 text-[10px] text-neutral-500 dark:border-neutral-800"><div className="truncate text-neutral-800 dark:text-neutral-300">{name}</div><div className="mt-0.5 truncate">{role?.name ?? 'Company member'}</div><CustomerSignOutButton/></div>
  </aside>
  <div className="flex min-w-0 flex-1 flex-col">
   <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800 sm:px-5 print:hidden">
    <div className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</div>
    <div className="flex min-w-0 items-center gap-2"><CustomerDigitalClock/><span className="mx-1 hidden h-7 w-px bg-neutral-200 dark:bg-neutral-700 sm:block"/><SoundToggle/><DarkModeToggle/><ProfileMenu userId={user.id} name={profile?.full_name ?? ''} role={role?.name ?? 'Company member'} email={profile?.email ?? user.email ?? ''} avatarUrl={profile?.avatar_url ?? null} workspaceDisplayName={companyName}/></div>
   </header>
   <CustomerWorkspacePreferencesProvider><main className="jaad-customer-scroll min-h-0 flex-1 overflow-y-auto p-4 dark:bg-neutral-900 sm:p-5 lg:p-5 print:bg-white print:p-0">{children}</main></CustomerWorkspacePreferencesProvider>
  </div>
 </div>;
}
