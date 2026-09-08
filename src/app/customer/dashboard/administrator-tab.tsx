'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STAFF_ROLE_OPTIONS } from './roles-config';

const ALL_MODULES: { key: string; label: string }[] = [
  { key: 'overview', label: 'Overview (Dashboard)' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'leads', label: 'Leads' },
  { key: 'shipments', label: 'My Shipments' },
  { key: 'track', label: 'Track' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'notes', label: 'Notes' },
  { key: 'report', label: 'Report' },
  { key: 'support', label: 'Support' },
  { key: 'profile', label: 'Profile' },
  { key: 'calculator', label: 'Calculator' },
  { key: 'utilities', label: 'Utilities' },
];

const STATUS_OPTIONS = ['Active', 'Leave', 'Suspended'] as const;

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  permitted_modules: string[];
  invited_at: string;
  accepted_at: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  removed_at: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function csvEscape(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function AdministratorTab({ customerId }: { customerId: string }) {
  const supabase = createClient();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string>('Account owner');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<string>(STAFF_ROLE_OPTIONS[0]);
  const [inviteModules, setInviteModules] = useState<Set<string>>(new Set(['overview']));
  const [inviting, setInviting] = useState(false);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setOwnerEmail(data.user.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_team_members')
      .select(
        'id, email, name, role, status, permitted_modules, invited_at, accepted_at, status_changed_at, status_changed_by, removed_at'
      )
      .eq('customer_id', customerId)
      .neq('status', 'Removed')
      .order('invited_at', { ascending: false });
    if (error) setError(error.message);
    setMembers(data ?? []);
    setLoading(false);
  }

  function toggleInviteModule(key: string) {
    setInviteModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/customer/dashboard`,
      },
    });
    return error;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError('Enter an email address.');
      return;
    }
    setError(null);
    setNotice(null);
    setInviting(true);

    const { error: insertError } = await supabase.from('customer_team_members').insert({
      customer_id: customerId,
      email,
      name: inviteName.trim() || null,
      role: inviteRole,
      status: 'Invited',
      permitted_modules: Array.from(inviteModules),
    });

    if (insertError) {
      setInviting(false);
      setError(insertError.message);
      return;
    }

    const linkError = await sendMagicLink(email);
    setInviting(false);

    if (linkError) {
      setError(
        `Staff record was created, but the login email failed to send: ${linkError.message}. Use "Resend invite email" below once it appears in the list.`
      );
    } else {
      setNotice(`Invite email sent to ${email}. They'll get full access the moment they log in.`);
    }

    setInviteOpen(false);
    setInviteEmail('');
    setInviteName('');
    setInviteRole(STAFF_ROLE_OPTIONS[0]);
    setInviteModules(new Set(['overview']));
    fetchMembers();
  }

  async function resendInvite(member: TeamMember) {
    setResendingId(member.id);
    setError(null);
    setNotice(null);
    const err = await sendMagicLink(member.email);
    setResendingId(null);
    if (err) {
      setError(`Couldn't resend to ${member.email}: ${err.message}`);
    } else {
      setNotice(`Login email resent to ${member.email}.`);
    }
  }

  async function toggleMemberModule(member: TeamMember, key: string) {
    const has = member.permitted_modules.includes(key);
    const next = has
      ? member.permitted_modules.filter((m) => m !== key)
      : [...member.permitted_modules, key];

    setSavingId(member.id);
    const { error } = await supabase
      .from('customer_team_members')
      .update({ permitted_modules: next })
      .eq('id', member.id);
    setSavingId(null);

    if (error) {
      setError(error.message);
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, permitted_modules: next } : m)));
  }

  async function changeRole(member: TeamMember, role: string) {
    setSavingId(member.id);
    const { error } = await supabase.from('customer_team_members').update({ role }).eq('id', member.id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
  }

  async function changeStatus(member: TeamMember, status: string) {
    setSavingId(member.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('customer_team_members')
      .update({ status, status_changed_at: now, status_changed_by: ownerEmail })
      .eq('id', member.id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, status, status_changed_at: now, status_changed_by: ownerEmail } : m))
    );
  }

  async function removeMember(member: TeamMember) {
    if (!confirm(`Remove ${member.email}? They will lose access immediately. This keeps their record for your files, it does not delete it.`)) return;
    setSavingId(member.id);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('customer_team_members')
      .update({ status: 'Removed', removed_at: now, status_changed_at: now, status_changed_by: ownerEmail })
      .eq('id', member.id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  }

  async function fetchFullHistoryForExport(): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('customer_team_members')
      .select(
        'id, email, name, role, status, permitted_modules, invited_at, accepted_at, status_changed_at, status_changed_by, removed_at'
      )
      .eq('customer_id', customerId)
      .order('invited_at', { ascending: false });
    if (error) {
      setError(error.message);
      return [];
    }
    return data ?? [];
  }

  function reportHeader() {
    return `Staff access report\nGenerated by: ${ownerEmail}\nGenerated at: ${formatDate(new Date().toISOString())}\n`;
  }

  async function downloadCsv() {
    const all = await fetchFullHistoryForExport();
    const headers = [
      'Name',
      'Email',
      'Role',
      'Status',
      'Invited At',
      'Accepted At',
      'Status Changed At',
      'Status Changed By',
      'Removed At',
      'Permitted Modules',
    ];
    const rows = all.map((m) => [
      m.name ?? '',
      m.email,
      m.role,
      m.status,
      formatDate(m.invited_at) ?? '',
      formatDate(m.accepted_at) ?? '',
      formatDate(m.status_changed_at) ?? '',
      m.status_changed_by ?? '',
      formatDate(m.removed_at) ?? '',
      m.permitted_modules.join('; '),
    ]);

    const csv =
      `# ${reportHeader().replace(/\n/g, ' | ')}\n` +
      [headers, ...rows].map((r) => r.map((c) => csvEscape(String(c))).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-access-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function printReport() {
    const all = await fetchFullHistoryForExport();
    const win = window.open('', '_blank');
    if (!win) return;

    const rowsHtml = all
      .map(
        (m) => `
      <tr>
        <td>${m.name ?? ''}</td>
        <td>${m.email}</td>
        <td>${m.role}</td>
        <td>${m.status}</td>
        <td>${formatDate(m.invited_at) ?? ''}</td>
        <td>${formatDate(m.accepted_at) ?? 'Not accepted'}</td>
        <td>${formatDate(m.status_changed_at) ?? ''}</td>
        <td>${m.status_changed_by ?? ''}</td>
        <td>${formatDate(m.removed_at) ?? ''}</td>
        <td>${m.permitted_modules.join(', ')}</td>
      </tr>`
      )
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Staff access report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { font-size: 12px; color: #555; margin: 2px 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Staff access report</h1>
          <p>Generated by: ${ownerEmail}</p>
          <p>Generated at: ${formatDate(new Date().toISOString())}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th>
                <th>Invited At</th><th>Accepted At</th><th>Status Changed At</th>
                <th>Status Changed By</th><th>Removed At</th><th>Permitted Modules</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text)]">Administrator</h3>
          <p className="text-[13px] text-[var(--subtext)]">
            Invite your team and choose exactly which tabs each person can see. You can change this any time.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white"
        >
          + Invite staff
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-[13px] text-[var(--error-text)]">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] p-3 text-[13px] text-[var(--success-text)]">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--subtext)]">Loading team...</p>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
          No team members yet. Invite your first one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-[var(--text)]">{member.name || member.email}</div>
                  <div className="text-[12px] text-[var(--subtext)]">{member.email}</div>
                  <div className="mt-1 text-[12px] text-[var(--subtext)]">
                    Invited {formatDate(member.invited_at)}
                    {' '}&middot;{' '}
                    {member.accepted_at ? (
                      <span className="text-[#1f9d5c]">Accepted {formatDate(member.accepted_at)}</span>
                    ) : (
                      <span className="text-[#ca8a04]">Not yet accepted</span>
                    )}
                  </div>
                  {member.status_changed_at && (
                    <div className="text-[11px] text-[var(--subtext)]">
                      Status last changed {formatDate(member.status_changed_at)} by {member.status_changed_by}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={member.role}
                    disabled={savingId === member.id}
                    onChange={(e) => changeRole(member, e.target.value)}
                    className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-[12px] text-[var(--text)]"
                  >
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    {!STAFF_ROLE_OPTIONS.includes(member.role as any) && (
                      <option value={member.role}>{member.role}</option>
                    )}
                  </select>

                  <select
                    value={STATUS_OPTIONS.includes(member.status as any) ? member.status : 'Active'}
                    disabled={savingId === member.id}
                    onChange={(e) => changeStatus(member, e.target.value)}
                    className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-[12px] font-semibold text-[var(--text)] disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {!member.accepted_at && (
                    <button
                      onClick={() => resendInvite(member)}
                      disabled={resendingId === member.id}
                      className="rounded-sm border border-[var(--input-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] disabled:opacity-50"
                    >
                      {resendingId === member.id ? 'Sending...' : 'Resend invite email'}
                    </button>
                  )}

                  <button
                    onClick={() => removeMember(member)}
                    disabled={savingId === member.id}
                    className="rounded-sm border border-[var(--error-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--error-text)] hover:bg-[var(--error-bg)] disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {ALL_MODULES.map((mod) => (
                  <label key={mod.key} className="flex items-center gap-2 text-[13px] text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={member.permitted_modules.includes(mod.key)}
                      disabled={savingId === member.id}
                      onChange={() => toggleMemberModule(member, mod.key)}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h4 className="mb-1 text-sm font-bold text-[var(--text)]">Staff access report</h4>
        <p className="mb-3 text-[12px] text-[var(--subtext)]">
          Full record for your files, includes removed staff and every status change. Keep this for compliance or law enforcement requests.
        </p>
        <div className="flex gap-2">
          <button
            onClick={downloadCsv}
            className="rounded-sm border border-[var(--input-border)] px-4 py-2 text-[12px] font-semibold text-[var(--text)]"
          >
            Download CSV
          </button>
          <button
            onClick={printReport}
            className="rounded-sm border border-[var(--input-border)] px-4 py-2 text-[12px] font-semibold text-[var(--text)]"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form
            onSubmit={handleInvite}
            className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">Invite staff</h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-[13px] font-semibold text-[var(--subtext)]">
                Close
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Name</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
              >
                {STAFF_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-[11px] font-semibold uppercase text-[var(--subtext)]">
                Tabs this person can see
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_MODULES.map((mod) => (
                  <label key={mod.key} className="flex items-center gap-2 text-[13px] text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={inviteModules.has(mod.key)}
                      onChange={() => toggleInviteModule(mod.key)}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="mb-3 text-sm text-[var(--error-text)]">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-sm border border-[var(--input-border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--subtext)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {inviting ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
