import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdminContext } from '@/lib/admin-security';
import EditRoleAccess from './edit-role-access';
import UserStatusSwitch from './user-status-switch';
import AddUserButton from './add-user-button';
import PostAnnouncementButton from './post-announcement-button';
import AuditLogRefreshButton from './audit-log-refresh-button';

const VIEWS = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles & access' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'audit', label: 'Audit log' },
] as const;

type AdminView = (typeof VIEWS)[number]['key'];

function isAdminView(value: string | undefined): value is AdminView {
  return VIEWS.some((view) => view.key === value);
}

function getAuditSummary(details: unknown): string | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const summary = (details as Record<string, unknown>).summary;
  return typeof summary === 'string' && summary.trim() ? summary : null;
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return withTime
    ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function QueryError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
      This section could not be loaded. {message}
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: requestedView } = await searchParams;
  const view: AdminView = isAdminView(requestedView) ? requestedView : 'users';

  const access = await requireAdminContext(['Super Admin']);
  if (!access.ok) {
    if (access.code === 'UNAUTHENTICATED') redirect('/login?next=%2Fadmin');
    redirect('/dashboard?access=denied');
  }

  const db = access.context.admin;
  const [rolesResult, usersResult, auditResult, announcementsResult] = await Promise.all([
    view === 'roles'
      ? db.from('roles').select('id, name, description, permitted_modules').order('name', { ascending: true })
      : Promise.resolve(null),
    view === 'users'
      ? db.from('profiles').select('id, full_name, email, status, created_at, roles(name)').order('created_at', { ascending: false })
      : Promise.resolve(null),
    view === 'audit'
      ? db.from('audit_log').select('id, actor_name, action, entity_type, entity_id, details, created_at').order('created_at', { ascending: false }).limit(100)
      : Promise.resolve(null),
    view === 'announcements'
      ? db.from('announcements').select('id, title, body, created_at').order('created_at', { ascending: false })
      : Promise.resolve(null),
  ]);

  const loadError =
    rolesResult?.error?.message ??
    usersResult?.error?.message ??
    auditResult?.error?.message ??
    announcementsResult?.error?.message ??
    null;

  return (
    <section className="min-w-0 space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Administration</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage users, role access, company announcements, and activity records.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {view === 'users' && <AddUserButton />}
          {view === 'announcements' && <PostAnnouncementButton />}
          {view === 'audit' && <AuditLogRefreshButton />}
        </div>
      </header>

      <nav aria-label="Administration sections" className="-mb-px flex max-w-full gap-5 overflow-x-auto border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800 sm:gap-6">
        {VIEWS.map((tab) => {
          const selected = view === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/admin?view=${tab.key}`}
              aria-current={selected ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-3 transition-colors ${
                selected
                  ? 'border-red-600 text-neutral-900 dark:text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <QueryError message={loadError} />

      {view === 'users' && !usersResult?.error && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">User accounts</h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Review assigned roles and control account access.</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {(usersResult?.data ?? []).length} total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] table-fixed text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[26%]" />
                <col className="w-[15%]" />
                <col className="w-[17%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400">
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                  <th scope="col" className="px-4 py-3 text-right">Account status</th>
                </tr>
              </thead>
              <tbody>
                {(usersResult?.data ?? []).map((user) => {
                  const role = Array.isArray(user.roles) ? user.roles[0] : user.roles;
                  return (
                    <tr key={user.id} className="border-t border-neutral-100 align-middle hover:bg-neutral-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/30">
                      <td className="truncate px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100" title={user.full_name ?? ''}>{user.full_name || 'Unnamed user'}</td>
                      <td className="truncate px-4 py-3 text-neutral-600 dark:text-neutral-400" title={user.email ?? ''}>{user.email || '—'}</td>
                      <td className="truncate px-4 py-3 text-neutral-600 dark:text-neutral-400" title={role?.name ?? ''}>{role?.name ?? 'Unassigned'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-500 dark:text-neutral-400">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right"><UserStatusSwitch id={user.id} status={user.status} /></td>
                    </tr>
                  );
                })}
                {!usersResult?.data?.length && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">No user accounts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'roles' && !rolesResult?.error && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Roles & module access</h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Changes apply to the permissions array saved for each role.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] table-fixed text-sm">
              <colgroup><col className="w-[18%]" /><col className="w-[24%]" /><col className="w-[40%]" /><col className="w-[18%]" /></colgroup>
              <thead>
                <tr className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400">
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Description</th>
                  <th scope="col" className="px-4 py-3">Modules granted</th>
                  <th scope="col" className="px-4 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {(rolesResult?.data ?? []).map((role) => (
                  <tr key={role.id} className="border-t border-neutral-100 align-top dark:border-neutral-800">
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">{role.name}</td>
                    <td className="break-words px-4 py-3 text-neutral-500 dark:text-neutral-400">{role.description || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(role.permitted_modules ?? []).length > 0 ? role.permitted_modules.map((module: string) => (
                          <span key={module} className="max-w-full truncate rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{module}</span>
                        )) : <span className="text-xs text-neutral-400">No modules assigned</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right"><EditRoleAccess roleId={role.id} roleName={role.name} current={role.permitted_modules ?? []} /></td>
                  </tr>
                ))}
                {!rolesResult?.data?.length && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">No roles found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'announcements' && !announcementsResult?.error && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Company announcements</h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Publish operational updates employees can read on their dashboard.</p>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{(announcementsResult?.data ?? []).length} published</span>
          </div>
          {(announcementsResult?.data ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-5 py-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-lg font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">!</div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No announcements yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500 dark:text-neutral-400">Use “Post announcement” to share policy changes, service notices, deadlines, or important company updates.</p>
            </div>
          )}
          {(announcementsResult?.data ?? []).map((announcement) => (
            <article key={announcement.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex gap-3 border-l-4 border-red-600 px-4 py-3.5 sm:px-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600 dark:bg-red-950/40 dark:text-red-300">!</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950/40 dark:text-red-300">Company update</span>
                    <time dateTime={announcement.created_at} className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(announcement.created_at, true)}</time>
                  </div>
                  <h3 className="mt-1.5 break-words text-sm font-semibold text-neutral-900 dark:text-neutral-100">{announcement.title}</h3>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600 dark:text-neutral-300">{announcement.body}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {view === 'audit' && !auditResult?.error && (
        <section className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">System activity log</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500 dark:text-neutral-400">This log records supported actions automatically, including user and role changes, announcements, and clock-tracker events. Refresh shows the latest 100 records; this screen is not a full vulnerability scanner.</p>
            </div>
            <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{(auditResult?.data ?? []).length} recent events</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed text-sm">
                <colgroup><col className="w-[18%]" /><col className="w-[22%]" /><col className="w-[13%]" /><col className="w-[27%]" /><col className="w-[20%]" /></colgroup>
                <thead>
                  <tr className="bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400">
                    <th scope="col" className="px-4 py-3">User</th>
                    <th scope="col" className="px-4 py-3">Activity</th>
                    <th scope="col" className="px-4 py-3">Record type</th>
                    <th scope="col" className="px-4 py-3">Details</th>
                    <th scope="col" className="px-4 py-3">Date & time</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditResult?.data ?? []).map((event) => {
                    const summary = getAuditSummary(event.details);
                    const recordLabel = event.entity_type ? String(event.entity_type).replaceAll('_', ' ') : '—';
                    return (
                      <tr key={event.id} className="border-t border-neutral-100 align-top dark:border-neutral-800">
                        <td className="break-words px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">{event.actor_name || 'System'}</td>
                        <td className="px-4 py-3"><span className="inline-flex max-w-full rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{event.action || 'Activity recorded'}</span></td>
                        <td className="px-4 py-3 text-xs capitalize text-neutral-500 dark:text-neutral-400">{recordLabel}</td>
                        <td className="break-words px-4 py-3 text-xs leading-5 text-neutral-600 dark:text-neutral-400">{summary || (event.entity_id ? `Record ID: ${event.entity_id}` : '—')}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{formatDate(event.created_at, true)}</td>
                      </tr>
                    );
                  })}
                  {!auditResult?.data?.length && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">No activity has been recorded yet.</p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">New supported admin and clock-tracker actions will appear here after the SQL migration is applied.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
