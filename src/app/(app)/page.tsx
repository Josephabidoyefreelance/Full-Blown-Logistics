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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RoleInfo = {
  name?: string | null;
  permitted_modules?: string[] | null;
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login');
  }

  // Keep these requests independent so a notification-query failure does not
  // prevent the application shell from rendering.
  const [profileResult, notificationsResult] = await Promise.all([
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

  const profile = profileResult.data;
  const joinedRole = profile?.roles;
  const role = (Array.isArray(joinedRole) ? joinedRole[0] : joinedRole) as RoleInfo | null;
  const isSuperAdmin = role?.name === 'Super Admin';
  const permittedModules = Array.isArray(role?.permitted_modules)
    ? role.permitted_modules
    : [];
  const fullName = profile?.full_name ?? '';
  const notifications = notificationsResult.data ?? [];

  const filteredNav = isSuperAdmin
    ? NAV
    : NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => permittedModules.includes(item.key)),
      })).filter((group) => group.items.length > 0);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 print:block print:h-auto print:overflow-visible">
      <aside className="flex w-64 shrink-0 flex-col bg-black text-neutral-300 print:hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-neutral-800 px-4 py-4">
          <Image
            src="/logo.png"
            alt="JAAD Logistics"
            width={36}
            height={36}
            priority
            className="rounded object-contain"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">JAAD ERP</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Operations
            </div>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="jaad-red-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3"
        >
          <style>{`
            .jaad-red-scrollbar { scrollbar-width: thin; scrollbar-color: #dc2626 transparent; }
            .jaad-red-scrollbar::-webkit-scrollbar { width: 8px; }
            .jaad-red-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .jaad-red-scrollbar::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 9999px; }
            .jaad-red-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
          `}</style>
          <NavMenu groups={filteredNav} />
        </nav>

        <div className="shrink-0 border-t border-neutral-800 px-4 py-3 text-[11px] text-neutral-400">
          <div className="truncate font-medium text-neutral-200">
            {fullName || profile?.email || user.email || 'Signed-in user'}
          </div>
          <div className="mt-1 text-neutral-500">{role?.name ?? 'No role assigned'}</div>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6 print:hidden">
          <div className="min-w-0 flex-1">
            <PageTitle />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <SoundToggle />
            <NotificationBell notifications={notifications} />
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

        <main className="jaad-red-scrollbar min-h-0 min-w-0 flex-1 overflow-auto bg-neutral-100 p-4 dark:bg-neutral-950 sm:p-6 lg:p-7 print:overflow-visible print:bg-white print:p-0">
          {profileResult.error ? (
            <div
              role="status"
              className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              Your workspace loaded, but your profile details could not be retrieved.
              Some navigation items may be hidden until your account role is available.
            </div>
          ) : null}

          {notificationsResult.error ? (
            <div
              role="status"
              className="mb-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              Notifications are temporarily unavailable. The rest of the workspace can still be used.
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}
