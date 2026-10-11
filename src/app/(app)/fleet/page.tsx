import { createClient } from '@/lib/supabase/server';
import FleetLiveRefresh from './live-refresh';
import FleetStatusSwitch from './status-switch';
import NewVehicleForm from './new-vehicle-form';
import AddInsuranceForm from './add-insurance-form';
import AddMaintenanceForm from './add-maintenance-form';
import MaintenanceStatusSwitch from './maintenance-status-switch';
import MaintenanceRecordsButton from './maintenance-records-modal';
import EditVehicleDetails from './edit-vehicle-details';

const TABS = [
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'insurance', label: 'Insurance' },
] as const;

function money(value: number | null | undefined) {
  return `₦${Number(value ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function dateText(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.ceil((target - start) / 86400000);
}

function statusClass(status: string) {
  if (status === 'Available') return 'bg-emerald-500/10 text-emerald-600';
  if (status === 'In Transit') return 'bg-blue-500/10 text-blue-600';
  if (status === 'Maintenance') return 'bg-amber-500/10 text-amber-600';
  if (status === 'Out of service') return 'bg-red-500/10 text-red-600';
  return 'bg-neutral-500/10 text-neutral-600';
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const params = await searchParams;
  const view = TABS.some((tab) => tab.key === params.view) ? (params.view as (typeof TABS)[number]['key']) : 'vehicles';
  const query = String(params.q ?? '').trim();

  const supabase = await createClient();

  const [{ data: vehicles, error: vehiclesError }, { data: allVehicles }, { data: insuranceRows, error: insuranceError }, { data: maintenanceRows, error: maintenanceError }] =
    await Promise.all([
      supabase
        .from('fleet_vehicles')
        .select('id, plate, type, status, next_service_date, insurer')
        .in('status', ['Available', 'In Transit', 'Idle'])
        .order('plate'),
      supabase.from('fleet_vehicles').select('id, plate, type, status, next_service_date, insurer').order('plate'),
      supabase
        .from('fleet_insurance')
        .select('id, vehicle_id, insurer, policy_number, coverage_type, premium, start_date, expiry_date')
        .order('expiry_date', { ascending: true }),
      supabase
        .from('fleet_maintenance')
        .select('id, vehicle_id, description, cost, service_date, status')
        .order('service_date', { ascending: false }),
    ]);

  const vehicleList = (vehicles ?? []).filter((v) => {
    if (!query) return true;
    const haystack = `${v.plate} ${v.type} ${v.status} ${v.insurer ?? ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const allFleetVehicles = allVehicles ?? [];
  const vehicleMap = new Map(allFleetVehicles.map((v) => [v.id, v.plate]));
  const insurance = insuranceRows ?? [];
  const maintenance = maintenanceRows ?? [];
  const counts = {
    total: allFleetVehicles.length,
    available: allFleetVehicles.filter((v) => v.status === 'Available').length,
    transit: allFleetVehicles.filter((v) => v.status === 'In Transit').length,
    maintenance: allFleetVehicles.filter((v) => v.status === 'Maintenance').length,
    out: allFleetVehicles.filter((v) => v.status === 'Out of service').length,
  };

  const serviceDue = vehicleList.filter((v) => {
    const d = daysUntil(v.next_service_date);
    return d !== null && d <= 30;
  }).length;

  const insuranceDue = insurance.filter((p) => {
    const d = daysUntil(p.expiry_date);
    return d !== null && d <= 30;
  }).length;

  const openMaintenance = maintenance.filter((m) => m.status !== 'Completed').length;
  const maintenanceSpend = maintenance.reduce((sum, m) => sum + Number(m.cost ?? 0), 0);

  return (
    <>
      <FleetLiveRefresh />
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v10H3z" />
                  <path d="M14 10h4l3 3v4h-7z" />
                  <circle cx="7" cy="19" r="2" />
                  <circle cx="18" cy="19" r="2" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Fleet</h1>
                <p className="text-sm text-neutral-500">Vehicle operations, maintenance, compliance and insurance control.</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {view === 'vehicles' && <NewVehicleForm />}
            {view === 'insurance' && <AddInsuranceForm vehicles={allVehicles ?? []} />}
            {view === 'maintenance' && (
              <>
                <MaintenanceRecordsButton vehicles={allVehicles ?? []} />
                <AddMaintenanceForm vehicles={allVehicles ?? []} />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Fleet size', counts.total, 'Vehicles on file'],
            ['Available', counts.available, 'Ready for dispatch'],
            ['In transit', counts.transit, 'Currently deployed'],
            ['Maintenance', counts.maintenance, 'In workshop'],
            ['Service due', serviceDue, 'Next 30 days'],
            ['Insurance due', insuranceDue, 'Next 30 days'],
          ].map(([label, value, sub]) => (
            <div key={String(label)} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
              <p className="mt-1 text-[11px] text-neutral-500">{sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              href={`/fleet?view=${tab.key}`}
              className={`border-b-2 px-1 pb-2.5 text-sm font-medium ${
                view === tab.key
                  ? 'border-red-600 text-neutral-900 dark:text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {view === 'vehicles' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Vehicle register</h2>
                <p className="text-xs text-neutral-500">A compact operational view of every vehicle in the fleet.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <form method="get" className="flex items-center gap-2">
                  <input type="hidden" name="view" value="vehicles" />
                  <input name="q" defaultValue={query} placeholder="Search plate, type or insurer" className="h-8 w-64 rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-800 outline-none focus:border-red-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100" />
                  <button className="h-8 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900">Search</button>
                  {query && <a href="/fleet?view=vehicles" className="text-[10px] text-neutral-500 hover:text-red-600">Clear</a>}
                </form>
                <div className="flex gap-2 text-[11px] text-neutral-500">
                  <span>{counts.available} available</span><span>•</span><span>{counts.transit} in transit</span><span>•</span><span>{counts.maintenance} in maintenance</span>
                </div>
              </div>
            </div>

            {vehiclesError && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                Could not load fleet: {vehiclesError.message}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {vehicleList.map((v) => {
                const serviceDays = daysUntil(v.next_service_date);
                const due = serviceDays !== null && serviceDays <= 30;
                const serviceLabel =
                  serviceDays === null
                    ? 'No service date'
                    : serviceDays < 0
                      ? `Service overdue by ${Math.abs(serviceDays)}d`
                      : serviceDays === 0
                        ? 'Service due today'
                        : `Service in ${serviceDays}d`;

                return (
                  <article
                    key={v.id}
                    className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-orange-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                    <div className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-mono text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                            {v.plate}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-neutral-500">
                            {v.type}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(v.status)}`}
                        >
                          {v.status}
                        </span>
                      </div>

                      <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-neutral-50 text-neutral-300 transition-colors duration-200 group-hover:bg-red-50/60 group-hover:text-red-300 dark:bg-neutral-800/60 dark:text-neutral-600 dark:group-hover:bg-red-950/20 dark:group-hover:text-red-900">
                        <svg
                          width="58"
                          height="42"
                          viewBox="0 0 58 42"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 25l4-10c.7-1.8 2.4-3 4.3-3h20.5c1.9 0 3.6 1.1 4.3 2.9l3 7.1H50c2.2 0 4 1.8 4 4v4H4v-3c0-2.2 1.8-4 4-4h0Z" />
                          <path d="M12 25h31" />
                          <path d="M18 12l2-5h18l2 5" />
                          <circle cx="14" cy="32" r="4" />
                          <circle cx="44" cy="32" r="4" />
                        </svg>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60">
                          <div className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
                            Next service
                          </div>
                          <div className={`mt-1 font-medium ${due ? 'text-amber-600' : 'text-neutral-700 dark:text-neutral-200'}`}>
                            <EditVehicleDetails vehicle={v} trigger="service" />
                          </div>
                        </div>

                        <div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60">
                          <div className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
                            Insurance
                          </div>
                          <div className="mt-1 truncate font-medium text-neutral-700 dark:text-neutral-200">
                            <EditVehicleDetails vehicle={v} trigger="insurance" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold ${
                            due ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {due ? serviceLabel : 'Service schedule OK'}
                        </span>

                        <FleetStatusSwitch id={v.id} status={v.status} />
                      </div>
                    </div>

                    <div className="border-t border-neutral-100 bg-neutral-50/70 px-4 py-2.5 text-[10px] text-neutral-400 transition-colors group-hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/30 dark:group-hover:bg-neutral-800/60">
                      <div className="flex items-center justify-between">
                        <span>Fleet vehicle</span>
                        <span className="font-medium text-neutral-500 dark:text-neutral-400">
                          Hover for details
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {!vehicleList.length && !vehiclesError && (
              <div className="rounded-2xl border border-dashed border-neutral-300 px-4 py-12 text-center dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">No vehicles yet</p>
                <p className="mt-1 text-xs text-neutral-400">Add your first vehicle to start managing the fleet.</p>
              </div>
            )}
          </section>
        )}

        {view === 'maintenance' && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Vehicles in workshop', counts.maintenance + counts.out],
                ['Open work orders', openMaintenance],
                ['Completed records', maintenance.filter((m) => m.status === 'Completed').length],
                ['Maintenance spend', money(maintenanceSpend)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
                </div>
              ))}
            </div>
            {maintenanceError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">Could not load maintenance: {maintenanceError.message}</p>}
            <div className="flex items-end justify-between gap-3">
              <div><h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Maintenance board</h2><p className="text-xs text-neutral-500">Vehicles in Maintenance or Out of service are shown here until their work is completed.</p></div>
              <span className="text-[11px] text-neutral-400">{maintenance.filter((m) => m.status !== 'Completed').length} active records</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {maintenance.filter((m) => m.status !== 'Completed').map((m) => {
                const vehicle = allFleetVehicles.find((v) => v.id === m.vehicle_id);
                return (
                  <article key={m.id} className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-red-500" />
                    <div className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3"><div><div className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">{vehicleMap.get(m.vehicle_id) ?? 'Unknown vehicle'}</div><div className="mt-0.5 text-xs text-neutral-500">{vehicle?.type ?? 'Fleet vehicle'}</div></div><MaintenanceStatusSwitch id={m.id} status={m.status} /></div>
                      <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-600">
                        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 30h32" /><path d="M13 30l3-11h20l4 11" /><circle cx="17" cy="35" r="4" /><circle cx="37" cy="35" r="4" /><path d="M26 8v7M22 11h8" /></svg>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60"><div className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">Work order</div><p className="mt-1 line-clamp-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">{m.description}</p></div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60"><div className="text-[9px] uppercase tracking-wide text-neutral-400">Service date</div><div className="mt-1 font-medium text-neutral-700 dark:text-neutral-200">{dateText(m.service_date)}</div></div><div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60"><div className="text-[9px] uppercase tracking-wide text-neutral-400">Cost</div><div className="mt-1 font-medium text-neutral-700 dark:text-neutral-200">{m.cost == null ? '—' : money(m.cost)}</div></div></div>
                      <div className="mt-3 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${m.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>{m.status}</span><span className="text-[10px] text-neutral-400">Complete to return vehicle</span></div>
                    </div>
                    <div className="border-t border-neutral-100 bg-neutral-50/70 px-4 py-2.5 text-[10px] text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/30">Active maintenance record</div>
                  </article>
                );
              })}
            </div>
            {!maintenance.filter((m) => m.status !== 'Completed').length && <div className="rounded-2xl border border-dashed border-neutral-300 px-4 py-12 text-center dark:border-neutral-700"><p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">No vehicles currently in maintenance</p><p className="mt-1 text-xs text-neutral-400">Switch a vehicle to Maintenance or Out of service and it will appear here automatically.</p></div>}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Vehicle maintenance records</h3><p className="text-xs text-neutral-500">Open a complete vehicle history, then print or download it.</p></div><MaintenanceRecordsButton vehicles={allFleetVehicles} /></div></div>
          </section>
        )}

        {view === 'insurance' && (
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Policies', insurance.length],
                ['Expiring soon', insuranceDue],
                ['Vehicles insured', new Set(insurance.map((p) => p.vehicle_id)).size],
                ['Active cover', insurance.filter((p) => {
                  const d = daysUntil(p.expiry_date);
                  return d === null || d >= 0;
                }).length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
                </div>
              ))}
            </div>

            {insuranceError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">Could not load insurance: {insuranceError.message}</p>}

            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[130px_180px_180px_170px_140px_150px_150px] bg-neutral-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60">
                  <div>Vehicle</div><div>Insurer</div><div>Policy</div><div>Coverage</div><div>Premium</div><div>Start</div><div className="text-right">Expiry</div>
                </div>
                {insurance.map((p) => {
                  const d = daysUntil(p.expiry_date);
                  const soon = d !== null && d <= 30;
                  return (
                    <div key={p.id} className="grid grid-cols-[130px_180px_180px_170px_140px_150px_150px] items-center border-t border-neutral-100 px-4 py-3 text-sm dark:border-neutral-800">
                      <div className="font-mono text-neutral-900 dark:text-neutral-100">{vehicleMap.get(p.vehicle_id) ?? '—'}</div>
                      <div className="truncate text-neutral-700 dark:text-neutral-300">{p.insurer}</div>
                      <div className="truncate text-neutral-700 dark:text-neutral-300">{p.policy_number ?? '—'}</div>
                      <div className="truncate text-neutral-700 dark:text-neutral-300">{p.coverage_type ?? '—'}</div>
                      <div className="text-neutral-700 dark:text-neutral-300">{p.premium == null ? '—' : money(p.premium)}</div>
                      <div className="text-neutral-700 dark:text-neutral-300">{dateText(p.start_date)}</div>
                      <div className={`text-right font-medium ${soon ? 'text-amber-600' : 'text-neutral-700 dark:text-neutral-300'}`}>{dateText(p.expiry_date)}</div>
                    </div>
                  );
                })}
                {!insurance.length && !insuranceError && <div className="px-4 py-10 text-center text-sm text-neutral-400">No insurance policies yet.</div>}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
