import { createClient } from '@/lib/supabase/server';
import EditRoleAccess from './edit-role-access';
import UserStatusSwitch from './user-status-switch';
import AddUserButton from './add-user-button';
import PostAnnouncementButton from './post-announcement-button';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'users' } = await searchParams;
  const supabase = await createClient();

  const roles = view === 'roles' ? await supabase.from('roles').select('id, name, description, permitted_modules') : null;
  const users = view === 'users' ? await supabase.from('profiles').select('id, full_name, email, status, created_at, roles(name)') : null;
  const audit = view === 'audit' ? await supabase.from('audit_log').select('id, actor_name, action, created_at').order('created_at', { ascending: false }).limit(50) : null;
  const announcements = view === 'announcements' ? await supabase.from('announcements').select('id, title, body, created_at').order('created_at', { ascending: false }) : null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Administration</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">RBAC, audit trail, users and integrations.</p>
        </div>
        {view === 'users' && <AddUserButton />}
        {view === 'announcements' && <PostAnnouncementButton />}
      </div>

      <div className="mb-4 flex gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
        {[
          { key: 'users', label: 'Users' },
          { key: 'roles', label: 'Roles & access' },
          { key: 'announcements', label: 'Announcements' },
          { key: 'audit', label: 'Audit log' },
        ].map((tab) => (
          <a
            key={tab.key}
            href={`/admin?view=${tab.key}`}
            className={`pb-2 ${
              view === tab.key
                ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* USERS */}
      {view === 'users' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Creation Date</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(users?.data ?? []).map((u) => {
                const role = Array.isArray(u.roles) ? u.roles[0] : u.roles;
                return (
                  <tr key={u.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{u.full_name}</td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{u.email}</td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{role?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <UserStatusSwitch id={u.id} status={u.status} />
                    </td>
                  </tr>
                );
              })}
              {!users?.data?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ROLES */}
      {view === 'roles' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Modules granted</th>
                <th className="px-4 py-2.5">Access</th>
              </tr>
            </thead>
            <tbody>
              {(roles?.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2.5 font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</td>
                  <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">{r.description}</td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{(r.permitted_modules ?? []).join(', ')}</td>
                  <td className="px-4 py-2.5">
                    <EditRoleAccess roleId={r.id} roleName={r.name} current={r.permitted_modules ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ANNOUNCEMENTS */}
      {view === 'announcements' && (
        <div className="space-y-3">
          {(announcements?.data ?? []).length === 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
              No announcements yet. Post one to show updates on the dashboard for all users.
            </div>
          )}
          {(announcements?.data ?? []).map((a) => (
            <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{a.title}</span>
                <span className="text-xs text-neutral-400">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* AUDIT LOG */}
      {view === 'audit' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5 text-center">Action</th>
                <th className="px-4 py-2.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {(audit?.data ?? []).map((a) => (
                <tr key={a.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">{a.actor_name}</td>
                  <td className="px-4 py-2.5 text-center text-neutral-600 dark:text-neutral-400">{a.action}</td>
                  <td className="px-4 py-2.5 text-right text-neutral-500 dark:text-neutral-500">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!audit?.data?.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">No activity logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
