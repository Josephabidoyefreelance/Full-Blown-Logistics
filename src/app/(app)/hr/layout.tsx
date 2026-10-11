import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
  const fullName = profile?.full_name ?? '';

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-950 print:bg-white">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
