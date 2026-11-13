import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { NAV } from '@/lib/nav';
import NavMenu from '@/components/nav-menu';
import SignOutButton from '@/components/sign-out-button';
import DarkModeToggle from '@/components/dark-mode-toggle';
import SoundToggle from '@/components/sound-toggle';
import NotificationBell from '@/components/notification-bell';
import ProfileMenu from '@/components/profile-menu';
import PageTitle from '@/components/page-title';
import LiveClock from '@/components/live-clock';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, email, role_id, avatar_url, roles(name, permitted_modules)')
      .eq('id', user.id).maybeSingle(),
    supabase.from('notifications')
      .select('id, message, read, created_at')
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const role = Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
  const permittedModules = Array.isArray(role?.permitted_modules) ? role.permitted_modules as string[] : [];
  const filteredNav = role?.name === 'Super Admin'
    ? NAV
    : NAV.map((group) => ({ ...group, items: group.items.filter((item) => permittedModules.includes(item.key)) }))
        .filter((group) => group.items.length > 0);

  // Missing or stale role/module keys should not trap the signed-in user on Dashboard.
  // This controls only what is rendered in navigation; every protected page/action must
  // continue to enforce authorization independently.
  const navToRender = filteredNav.length ? filteredNav : NAV;

  let tenant: { id?: string; company_name?: string | null; logo_url?: string | null } | null = null;
  const ownedTenant = await supabase.from('customers').select('id,company_name,logo_url').eq('user_id', user.id).maybeSingle();
  if (ownedTenant.data) tenant = ownedTenant.data;
  if (!tenant) {
    const membership = await supabase.from('customer_team_members').select('customer_id').eq('member_user_id', user.id).maybeSingle();
    if (membership.data?.customer_id) {
      const teamTenant = await supabase.from('customers').select('id,company_name,logo_url').eq('id', membership.data.customer_id).maybeSingle();
      if (teamTenant.data) tenant = teamTenant.data;
    }
  }

  const fullName = profile?.full_name ?? '';
  const workspaceName = tenant?.company_name?.trim() || 'JAAD ERP';
  const workspaceLogo = tenant?.logo_url || null;

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-neutral-100 dark:bg-neutral-950 print:bg-white">
      <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-black text-neutral-300 print:hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-4 py-4">
          {workspaceLogo ? <img src={workspaceLogo} alt={`${workspaceName} logo`} className="h-8 w-8 shrink-0 rounded object-contain" /> : <Image src="/logo.png" alt="JAAD ERP" width={32} height={32} className="rounded" priority />}
          <div className="min-w-0"><div className="truncate text-sm font-bold text-white">{workspaceName}</div><div className="text-[10px] uppercase tracking-widest text-neutral-400">Operations</div></div>
        </div>

        <nav aria-label="Main navigation" className="jaad-red-scrollbar min-h-0 flex-1 touch-pan-y overscroll-y-contain overflow-x-hidden overflow-y-auto px-2 py-3">
          <NavMenu groups={navToRender} />
          {!filteredNav.length && <p className="mx-2 mt-4 rounded-md border border-amber-700 bg-neutral-900 px-3 py-2 text-xs leading-5 text-neutral-200">Your account has no matching navigation permissions. All module links are shown as a recovery aid; assign the correct role and permissions before relying on access controls.</p>}
        </nav>

        <div className="shrink-0 border-t border-neutral-800 bg-black px-4 py-3 text-[11px] text-neutral-300">
          <div className="truncate font-medium text-white">{fullName || user.email || 'Signed-in user'}</div>
          <div className="mt-0.5 text-neutral-400">{role?.name ?? 'No role assigned'}</div>
          <div className="mt-2"><SignOutButton /></div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6 print:hidden">
          <PageTitle />
          <div className="flex items-center gap-2"><LiveClock /><SoundToggle /><NotificationBell notifications={notifications ?? []} /><DarkModeToggle />
            <ProfileMenu userId={user.id} name={fullName} role={role?.name ?? 'No role assigned'} email={profile?.email ?? user.email ?? ''} avatarUrl={profile?.avatar_url ?? null} />
          </div>
        </header>
        <main className="jaad-red-scrollbar min-h-0 flex-1 touch-pan-y overscroll-y-contain overflow-x-hidden overflow-y-auto p-4 dark:bg-neutral-950 sm:p-7 print:p-0">{children}</main>
      </div>
      <style>{`
        .jaad-red-scrollbar { scrollbar-width: thin; scrollbar-color: #dc2626 #171717; }
        .jaad-red-scrollbar::-webkit-scrollbar { width: 9px; height: 9px; }
        .jaad-red-scrollbar::-webkit-scrollbar-track { background: #171717; }
        .jaad-red-scrollbar::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 9999px; border: 2px solid #171717; }
        .jaad-red-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
      `}</style>
    </div>
  );
}
