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
      .single(),
    supabase
      .from('notifications')
      .select('id, message, read, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // roles() comes back as an array from the join; normalise to a single object.
  const role = Array.isArray(profile?.roles) ? profile?.roles[0] : profile?.roles;
  const permittedModules: string[] = role?.permitted_modules ?? [];
  const fullName = profile?.full_name ?? '';

  const filteredNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((it) => permittedModules.includes(it.key)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 print:bg-white">
      <aside className="flex w-64 flex-shrink-0 flex-col bg-black text-neutral-300 print:hidden">
        <div className="flex items-center gap-2 border-b-0 px-4 py-4">
          <Image src="/logo.png" alt="JAAD Logistics" width={32} height={32} className="rounded" />
          <div>
            <div className="text-sm font-bold text-white">JAAD ERP</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Operations</div>
          </div>
        </div>
        <nav className="red-scrollbar flex-1 overflow-y-auto px-2 py-3">
          <style>{`
            .red-scrollbar::-webkit-scrollbar { width: 8px; }
            .red-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .red-scrollbar::-webkit-scrollbar-thumb { background-color: #dc2626 !important; border-radius: 9999px; }
            .red-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #ef4444 !important; }
            .red-scrollbar::-webkit-scrollbar-thumb:active { background-color: #f87171 !important; }
            .red-scrollbar { scrollbar-color: #dc2626 transparent; }
          `}</style>
          <NavMenu groups={filteredNav} />
        </nav>
        <div className="border-t border-neutral-800 px-4 py-3 text-[11px] text-neutral-500">
          {profile?.full_name}
          <br />
          {role?.name ?? 'No role assigned'}
          <SignOutButton />
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
              email={profile?.email ?? ''}
              avatarUrl={profile?.avatar_url ?? null}
            />
          </div>
        </header>
        <main className="red-scrollbar min-h-0 flex-1 overflow-y-auto p-7 dark:bg-neutral-950 print:p-0">{children}</main>
      </div>
    </div>
  );
}
