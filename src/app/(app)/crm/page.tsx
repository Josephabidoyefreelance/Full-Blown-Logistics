import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LeadStatusSwitch from './lead-status-switch';
import LeadPrioritySwitch from './lead-priority-switch';
import AssignedToSwitch from './assigned-to-switch';
import NewLeadForm from './new-lead-form';
import LeadDetailTrigger from './lead-detail-modal';
import ImportLeadsButton from './import-leads-button';
import DonutChart from '@/components/donut-chart';
import SheetView from './sheet-view';
import ConvertLeadButton from './convert-lead-button';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

const LANES: { label: string; color: string; match: (s: string) => boolean }[] = [
  { label: 'New', color: '#2563c7', match: (s) => s === 'New' },
  {
    label: 'Contacted',
    color: '#ca8a04',
    match: (s) => s === 'Contacted' || s === 'Qualified' || s === 'Proposal Sent',
  },
  { label: 'Won', color: '#1f9d5c', match: (s) => s === 'Won' },
  { label: 'Lost', color: '#e2362b', match: (s) => s === 'Lost' },
];

const SOURCE_COLORS: Record<string, string> = {
  Website: '#3b82f6',
  Referral: '#16a34a',
  'Cold Call': '#f59e0b',
  'Social Media': '#8b5cf6',
  'Trade Show': '#dc2626',
  Other: '#6b7280',
};

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'leads' } = await searchParams;
  const supabase = await createClient();

  const [{ data: leads, error }, { data: staff }, { data: noteRows }] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, company, contact_name, job_title, email, phone, priority, status, value, assigned_to, source, transport_mode, origin, destination, callback_date'
      )
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('lead_notes').select('lead_id'),
  ]);

  const noteCounts: Record<string, number> = {};
  (noteRows ?? []).forEach((n: { lead_id: string }) => {
    noteCounts[n.lead_id] = (noteCounts[n.lead_id] || 0) + 1;
  });

  const sourceGroups: Record<string, { count: number; value: number }> = {};
  (leads ?? []).forEach((l) => {
    const src = l.source || 'Other';
    if (!sourceGroups[src]) sourceGroups[src] = { count: 0, value: 0 };
    sourceGroups[src].count++;
    sourceGroups[src].value += Number(l.value) || 0;
  });

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">CRM & Leads</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Lead capture through to customer conversion.</p>
        </div>
        <div className="flex gap-2">
          <ImportLeadsButton />
          <NewLeadForm />
        </div>
      </div>

      <div className="mb-4 flex gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
        <Link
          href="/crm?view=leads"
          className={`pb-2 ${view === 'leads' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          Leads
        </Link>
        <Link
          href="/crm?view=kanban"
          className={`pb-2 ${view === 'kanban' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          Kanban
        </Link>
        <Link
          href="/crm?view=sheet"
          className={`pb-2 ${view === 'sheet' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          Sheet
        </Link>
        <Link
          href="/crm?view=campaigns"
          className={`pb-2 ${view === 'campaigns' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          Campaigns
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">Could not load leads: {error.message}</p>}

      {view === 'kanban' && (
        <div className="grid grid-cols-4 gap-3">
          {LANES.map((lane) => {
            const items = (leads ?? []).filter((l) => lane.match(l.status));
            return (
              <div
                key={lane.label}
                className="rounded-xl border-t-2 bg-neutral-50 p-3 dark:bg-neutral-900"
                style={{ borderTopColor: lane.color }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase" style={{ color: lane.color }}>
                    {lane.label}
                  </h4>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: lane.color + '22', color: lane.color }}
                  >
                    {items.length}
                  </span>
                </div>
                {items.map((l) => (
                  <div
                    key={l.id}
                    className="mb-2 rounded-lg border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-800"
                  >
                    <LeadDetailTrigger lead={l} staff={staff ?? []} />
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {l.contact_name} &middot; {nairaFmt(l.value)}
                    </div>
                  </div>
                ))}
                {!items.length && (
                  <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-600">No leads</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'sheet' && <SheetView />}

      {view === 'campaigns' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Leads by source</h3>
            <DonutChart
              total={leads?.length ?? 0}
              segments={Object.entries(sourceGroups).map(([source, stats]) => ({
                label: source,
                value: stats.count,
                color: SOURCE_COLORS[source] ?? SOURCE_COLORS.Other,
              }))}
            />
          </div>

          {Object.entries(sourceGroups).map(([source, stats]) => {
            const color = SOURCE_COLORS[source] ?? SOURCE_COLORS.Other;
            const totalValue = (leads ?? []).reduce((s, l) => s + (Number(l.value) || 0), 0);
            const share = totalValue > 0 ? Math.round((stats.value / totalValue) * 100) : 0;
            return (
              <div
                key={source}
                className="rounded-xl border-t-2 bg-white p-4 shadow-sm dark:bg-neutral-900"
                style={{ borderTopColor: color }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{source}</div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.count}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">leads</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {nairaFmt(stats.value)}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">pipeline value</div>
                  </div>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${share}%`, backgroundColor: color }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                  {share}% of pipeline value
                </div>
              </div>
            );
          })}
          {!Object.keys(sourceGroups).length && (
            <div className="col-span-3 py-8 text-center text-sm text-neutral-400 dark:text-neutral-600">
              No leads yet.
            </div>
          )}
        </div>
      )}

      {view === 'leads' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_88px] items-center bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              <div>Company</div>
              <div>Contact</div>
              <div>Priority</div>
              <div>Status</div>
              <div>Assigned to</div>
              <div>Value</div>
              <div>Notes</div>
              <div>Convert</div>
              <div className="text-right">Actions</div>
            </div>

            {(leads ?? []).map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-[repeat(8,minmax(0,1fr))_88px] items-center border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
              >
                <LeadDetailTrigger lead={l} staff={staff ?? []} />
                <div className="truncate text-neutral-700 dark:text-neutral-300">{l.contact_name}</div>
                <div>
                  <LeadPrioritySwitch id={l.id} priority={l.priority} />
                </div>
                <div>
                  <LeadStatusSwitch id={l.id} status={l.status} />
                </div>
                <AssignedToSwitch id={l.id} assignedTo={l.assigned_to ?? null} staff={staff ?? []} />
                <div className="text-neutral-900 dark:text-neutral-100">{nairaFmt(l.value)}</div>
                <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {noteCounts[l.id] ? `${noteCounts[l.id]} note${noteCounts[l.id] > 1 ? 's' : ''}` : '—'}
                </div>
                <div>
                  <ConvertLeadButton id={l.id} company={l.company} />
                </div>
                <div className="flex justify-end gap-1.5">
                  <a
                    href={l.phone ? `tel:${l.phone}` : undefined}
                    title={l.phone ? `Call ${l.phone}` : 'No phone on file'}
                    className={`rounded-md border border-neutral-300 p-1.5 dark:border-neutral-700 ${
                      l.phone
                        ? 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        : 'pointer-events-none text-neutral-300 dark:text-neutral-700'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </a>
                  <a
                    href={l.email ? `mailto:${l.email}` : undefined}
                    title={l.email ? `Email ${l.email}` : 'No email on file'}
                    className={`rounded-md border border-neutral-300 p-1.5 dark:border-neutral-700 ${
                      l.email
                        ? 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        : 'pointer-events-none text-neutral-300 dark:text-neutral-700'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16v16H4z" opacity="0" />
                      <path d="M22 6c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6z" />
                      <path d="m22 6-10 7L2 6" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}

            {!leads?.length && !error && (
              <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">No leads yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
