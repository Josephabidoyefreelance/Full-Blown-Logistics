import { createClient } from '@/lib/supabase/server';
import DonutChart from '@/components/donut-chart';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'overview' } = await searchParams;
  const supabase = await createClient();

  const [bookings, fleet, invoices, expenses, leads, drivers, tickets] = await Promise.all([
    supabase.from('bookings').select('status'),
    supabase.from('fleet_vehicles').select('status'),
    supabase.from('invoices').select('amount, status'),
    supabase.from('expenses').select('amount'),
    supabase.from('leads').select('priority'),
    supabase.from('drivers').select('status'),
    supabase.from('tickets').select('status'),
  ]);

  const shipmentCounts: Record<string, number> = {
    Pending: 0,
    Assigned: 0,
    'In Transit': 0,
    Delivered: 0,
    Cancelled: 0,
  };
  (bookings.data ?? []).forEach((b) => {
    if (b.status in shipmentCounts) shipmentCounts[b.status]++;
  });

  const fleetCounts: Record<string, number> = {
    Available: 0,
    'In Transit': 0,
    Maintenance: 0,
    'Out of service': 0,
  };
  (fleet.data ?? []).forEach((f) => {
    if (f.status in fleetCounts) fleetCounts[f.status]++;
  });

  const leadCounts: Record<string, number> = { Hot: 0, Warm: 0, Cold: 0 };
  (leads.data ?? []).forEach((l) => {
    if (l.priority in leadCounts) leadCounts[l.priority]++;
  });

  const driverCounts: Record<string, number> = { Available: 0, 'On trip': 0, 'Off duty': 0 };
  (drivers.data ?? []).forEach((d) => {
    if (d.status in driverCounts) driverCounts[d.status]++;
  });

  const invoiceCounts: Record<string, number> = { Paid: 0, Pending: 0, Overdue: 0 };
  (invoices.data ?? []).forEach((i) => {
    if (i.status in invoiceCounts) invoiceCounts[i.status]++;
  });

  const ticketCounts: Record<string, number> = { Open: 0, Resolved: 0 };
  (tickets.data ?? []).forEach((t) => {
    if (t.status in ticketCounts) ticketCounts[t.status]++;
  });

  const revenue = (invoices.data ?? []).filter((i) => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0);
  const expenseTotal = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Live overview of shipments, fleet, and revenue</p>
      </div>

      <div className="mb-4 flex gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
        <a
          href="/dashboard?view=overview"
          className={`pb-2 ${view === 'overview' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          Overview
        </a>
        <a
          href="/dashboard?view=breakdown"
          className={`pb-2 ${view === 'breakdown' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
        >
          Breakdown
        </a>
      </div>

      {view === 'overview' && (
        <>
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Shipments</h3>
              <span className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">
                {bookings.data?.length ?? 0} total on file
              </span>
            </div>
            <div className="mt-3 flex divide-x divide-neutral-200 dark:divide-neutral-800">
              {Object.entries(shipmentCounts).map(([label, n]) => (
                <div key={label} className="flex-1 px-4 first:pl-0">
                  <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">{n}</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Fleet</h3>
              <span className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">
                {fleet.data?.length ?? 0} vehicles on file
              </span>
            </div>
            <div className="mt-3 flex divide-x divide-neutral-200 dark:divide-neutral-800">
              {Object.entries(fleetCounts).map(([label, n]) => (
                <div key={label} className="flex-1 px-4 first:pl-0">
                  <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">{n}</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border-x border-b border-t-2 border-t-red-600 border-neutral-200 bg-white p-4 dark:border-x-neutral-800 dark:border-b-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Revenue, MTD</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(revenue)}</div>
              <div className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">from paid invoices</div>
            </div>
            <div className="rounded-xl border-x border-b border-t-2 border-t-red-600 border-neutral-200 bg-white p-4 dark:border-x-neutral-800 dark:border-b-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Expenses, MTD</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(expenseTotal)}</div>
              <div className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{expenses.data?.length ?? 0} logged</div>
            </div>
            <div className="rounded-xl border-x border-b border-t-2 border-t-red-600 border-neutral-200 bg-white p-4 dark:border-x-neutral-800 dark:border-b-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Profit, MTD</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(revenue - expenseTotal)}</div>
              <div className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">revenue minus expenses</div>
            </div>
            <div className="rounded-xl border-x border-b border-t-2 border-t-red-600 border-neutral-200 bg-white p-4 dark:border-x-neutral-800 dark:border-b-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">VAT payable, 7.5%</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(revenue * 0.075)}</div>
              <div className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">on paid revenue</div>
            </div>
          </div>
        </>
      )}

      {view === 'breakdown' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Shipments by status</h3>
            <DonutChart
              total={bookings.data?.length ?? 0}
              segments={[
                { label: 'Pending', value: shipmentCounts.Pending, color: '#f59e0b' },
                { label: 'Assigned', value: shipmentCounts.Assigned, color: '#3b82f6' },
                { label: 'In Transit', value: shipmentCounts['In Transit'], color: '#8b5cf6' },
                { label: 'Delivered', value: shipmentCounts.Delivered, color: '#16a34a' },
                { label: 'Cancelled', value: shipmentCounts.Cancelled, color: '#6b7280' },
              ]}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Fleet by status</h3>
            <DonutChart
              total={fleet.data?.length ?? 0}
              segments={[
                { label: 'Available', value: fleetCounts.Available, color: '#16a34a' },
                { label: 'In Transit', value: fleetCounts['In Transit'], color: '#3b82f6' },
                { label: 'Maintenance', value: fleetCounts.Maintenance, color: '#f59e0b' },
                { label: 'Out of service', value: fleetCounts['Out of service'], color: '#dc2626' },
              ]}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Leads by priority</h3>
            <DonutChart
              total={leads.data?.length ?? 0}
              segments={[
                { label: 'Hot', value: leadCounts.Hot, color: '#dc2626' },
                { label: 'Warm', value: leadCounts.Warm, color: '#f59e0b' },
                { label: 'Cold', value: leadCounts.Cold, color: '#3b82f6' },
              ]}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Drivers by status</h3>
            <DonutChart
              total={drivers.data?.length ?? 0}
              segments={[
                { label: 'Available', value: driverCounts.Available, color: '#16a34a' },
                { label: 'On trip', value: driverCounts['On trip'], color: '#3b82f6' },
                { label: 'Off duty', value: driverCounts['Off duty'], color: '#6b7280' },
              ]}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Invoices by status</h3>
            <DonutChart
              total={invoices.data?.length ?? 0}
              segments={[
                { label: 'Paid', value: invoiceCounts.Paid, color: '#16a34a' },
                { label: 'Pending', value: invoiceCounts.Pending, color: '#f59e0b' },
                { label: 'Overdue', value: invoiceCounts.Overdue, color: '#dc2626' },
              ]}
            />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Tickets by status</h3>
            <DonutChart
              total={tickets.data?.length ?? 0}
              segments={[
                { label: 'Open', value: ticketCounts.Open, color: '#f59e0b' },
                { label: 'Resolved', value: ticketCounts.Resolved, color: '#16a34a' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
