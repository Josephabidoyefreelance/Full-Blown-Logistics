import { createClient } from '@/lib/supabase/server';
import StatusSwitch from './status-switch';
import NewVehicleForm from './new-vehicle-form';
import AddInsuranceForm from './add-insurance-form';
import AddMaintenanceForm from './add-maintenance-form';
import MaintenanceStatusSwitch from './maintenance-status-switch';

const TABS = [
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'insurance', label: 'Insurance' },
];

const VEHICLE_COLS = 'grid-cols-[160px_220px_160px_180px_160px_220px]';

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? 'vehicles';

  const supabase = await createClient();

  const { data: allVehicles } = await supabase.from('fleet_vehicles').select('id, plate').order('plate');
  const { data: staff } = await supabase.from('employees').select('id, name').order('name');

  const { data: vehicles, error } =
    view === 'vehicles'
      ? await supabase
          .from('fleet_vehicles')
          .select('id, plate, type, status, next_service_date, insurer, drivers(name)')
          .order('plate')
      : { data: null, error: null };

  const { data: insuranceRows, error: insuranceError } =
    view === 'insurance'
      ? await supabase
          .from('fleet_insurance')
          .select('id, insurer, policy_number, coverage_type, premium, start_date, expiry_date, fleet_vehicles(plate)')
          .order('expiry_date', { ascending: true })
      : { data: null, error: null };

  const { data: maintenanceRows, error: maintenanceError } =
    view === 'maintenance'
      ? await supabase
          .from('fleet_maintenance')
          .select('id, description, cost, service_date, status, fleet_vehicles(plate), employees(name)')
          .order('service_date', { ascending: false })
      : { data: null, error: null };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Fleet</h1>
          <p className="text-sm text-neutral-500">Vehicles, maintenance and insurance.</p>
        </div>
        {view === 'vehicles' && <NewVehicleForm />}
        {view === 'insurance' && <AddInsuranceForm vehicles={allVehicles ?? []} />}
        {view === 'maintenance' && <AddMaintenanceForm vehicles={allVehicles ?? []} staff={staff ?? []} />}
      </div>

      <div className="mb-5 flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/fleet?view=${t.key}`}
            className={`pb-2.5 text-sm font-medium ${
              view === t.key
                ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {view === 'vehicles' && (
        <div>
          {error && <p className="mb-4 text-sm text-red-600">Could not load fleet: {error.message}</p>}

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1100px]">
              <div
                className={`grid ${VEHICLE_COLS} items-center justify-between px-4 py-2.5 text-[11px] uppercase text-neutral-500 bg-neutral-50 dark:bg-neutral-800/60 dark:text-neutral-400`}
              >
                <div>Plate</div>
                <div>Type</div>
                <div>Status</div>
                <div>Driver</div>
                <div>Next service</div>
                <div className="text-right">Insurer</div>
              </div>

              {(vehicles ?? []).map((v) => {
                const driver = Array.isArray(v.drivers) ? v.drivers[0] : v.drivers;
                return (
                  <div
                    key={v.id}
                    className={`grid ${VEHICLE_COLS} items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800`}
                  >
                    <div className="truncate font-mono text-neutral-900 dark:text-neutral-100">{v.plate}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{v.type}</div>
                    <div>
                      <StatusSwitch id={v.id} status={v.status} />
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {driver?.name ?? 'Unassigned'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {v.next_service_date ?? '\u2014'}
                    </div>
                    <div className="truncate text-right text-neutral-700 dark:text-neutral-300">
                      {v.insurer ?? '\u2014'}
                    </div>
                  </div>
                );
              })}

              {!vehicles?.length && !error && (
                <div className="px-4 py-8 text-center text-neutral-400">No vehicles yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'insurance' && (
        <div>
          {insuranceError && (
            <p className="mb-4 text-sm text-red-600">Could not load insurance: {insuranceError.message}</p>
          )}

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[130px_180px_160px_160px_130px_140px_140px] items-center justify-between bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <div>Plate</div>
                <div>Insurer</div>
                <div>Policy no.</div>
                <div>Coverage</div>
                <div>Premium</div>
                <div>Start</div>
                <div className="text-right">Expiry</div>
              </div>

              {(insuranceRows ?? []).map((p) => {
                const veh = Array.isArray(p.fleet_vehicles) ? p.fleet_vehicles[0] : p.fleet_vehicles;
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-[130px_180px_160px_160px_130px_140px_140px] items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
                  >
                    <div className="truncate font-mono text-neutral-900 dark:text-neutral-100">
                      {veh?.plate ?? '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{p.insurer}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{p.policy_number ?? '\u2014'}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{p.coverage_type ?? '\u2014'}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {p.premium ? `\u20a6${Number(p.premium).toLocaleString()}` : '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{p.start_date ?? '\u2014'}</div>
                    <div className="truncate text-right text-neutral-700 dark:text-neutral-300">
                      {p.expiry_date ?? '\u2014'}
                    </div>
                  </div>
                );
              })}

              {!insuranceRows?.length && !insuranceError && (
                <div className="px-4 py-8 text-center text-neutral-400">No insurance policies yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'maintenance' && (
        <div>
          {maintenanceError && (
            <p className="mb-4 text-sm text-red-600">Could not load maintenance: {maintenanceError.message}</p>
          )}

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[130px_280px_170px_140px_140px_140px] items-center justify-between bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <div>Plate</div>
                <div>Description</div>
                <div>Raised by</div>
                <div>Cost</div>
                <div>Date</div>
                <div className="text-right">Status</div>
              </div>

              {(maintenanceRows ?? []).map((m) => {
                const veh = Array.isArray(m.fleet_vehicles) ? m.fleet_vehicles[0] : m.fleet_vehicles;
                const raiser = Array.isArray(m.employees) ? m.employees[0] : m.employees;
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[130px_280px_170px_140px_140px_140px] items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
                  >
                    <div className="truncate font-mono text-neutral-900 dark:text-neutral-100">
                      {veh?.plate ?? '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{m.description}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {raiser?.name ?? 'Unassigned'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {m.cost ? `\u20a6${Number(m.cost).toLocaleString()}` : '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {m.service_date ?? '\u2014'}
                    </div>
                    <div className="flex justify-end">
                      <MaintenanceStatusSwitch id={m.id} status={m.status} />
                    </div>
                  </div>
                );
              })}

              {!maintenanceRows?.length && !maintenanceError && (
                <div className="px-4 py-8 text-center text-neutral-400">No maintenance records yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
