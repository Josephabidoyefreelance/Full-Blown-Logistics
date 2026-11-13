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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, role_id, avatar_url, roles(name, permitted_modules)')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('notifications')
      .select('id, message, read, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Supabase relationship joins may be returned as an object or an array.
  const role = Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
  const isSuperAdmin = role?.name === 'Super Admin';
  const permittedModules = Array.isArray(role?.permitted_modules)
    ? (role.permitted_modules as string[])
    : [];
  // Customer company accounts must never render the JAAD internal operations shell.
  // Preserve existing operations roles and Super Admin navigation.
  const roleName = String(role?.name ?? '').trim().toLowerCase();
  if (!isSuperAdmin && (
    roleName.includes('customer') ||
    roleName === 'company owner' ||
    roleName === 'company member'
  )) {
    redirect('/customer/dashboard/packages');
  }

  const fullName = profile?.full_name ?? '';

  const filteredNav = isSuperAdmin
    ? NAV
    : NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => permittedModules.includes(item.key)),
      })).filter((group) => group.items.length > 0);

  // Do not leave a completely blank sidebar if role permissions are empty or
  // use older module keys. Show navigation links so the user can reach pages;
  // each page/server action must still enforce its own authorization checks.
  const navToRender = filteredNav.length > 0
    ? filteredNav
    : NAV.filter((group) => group.items.some((item) => item.key === 'dashboard'))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.key === 'dashboard'),
        }));

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 print:bg-white">
      <aside className="flex w-64 shrink-0 flex-col bg-black text-neutral-300 print:hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-4 py-4">
          <Image
            src="/logo.png"
            alt="JAAD Logistics"
            width={32}
            height={32}
            className="rounded"
            style={{ width: 32, height: 'auto' }}
            priority
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">JAAD ERP</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">Operations</div>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="red-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3"
        >
          <style>{`
            .red-scrollbar::-webkit-scrollbar { width: 8px; }
            .red-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .red-scrollbar::-webkit-scrollbar-thumb { background-color: #dc2626 !important; border-radius: 9999px; }
            .red-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #ef4444 !important; }
            .red-scrollbar { scrollbar-color: #dc2626 transparent; }
          `}</style>
          <NavMenu groups={navToRender} />
          {filteredNav.length === 0 && (
            <p className="mx-2 mt-4 rounded-md border border-red-900 bg-neutral-900 px-3 py-2 text-xs leading-5 text-neutral-200">
              Your account has no matching navigation permissions. Only Dashboard is shown until your role permissions are corrected.
            </p>
          )}
        </nav>

        <div className="shrink-0 border-t border-neutral-800 bg-black px-4 py-3 text-[11px] text-neutral-300">
          <div className="truncate font-medium text-white">{fullName || user.email || 'Signed-in user'}</div>
          <div className="mt-0.5 text-neutral-400">{role?.name ?? 'No role assigned'}</div>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
          <PageTitle />
          <div className="flex items-center gap-2">
            <SoundToggle />
            <NotificationBell notifications={notifications ?? []} />
            <DarkModeToggle />
            <ProfileMenu
              userId={user.id}
              name={fullName}
              role={role?.name ?? 'No role assigned'}
              email={profile?.email ?? user.email ?? ''}
              avatarUrl={profile?.avatar_url ?? null}
            />
          </div>
        </header>
        <main className="red-scrollbar min-h-0 flex-1 overflow-y-auto p-7 dark:bg-neutral-950 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
