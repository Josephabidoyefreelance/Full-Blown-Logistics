import { createClient } from '@/lib/supabase/server';
import StatusSwitch from './status-switch';
import NewBookingForm from './new-booking-form';
import ExportBookingsButton from './export-bookings-button';
import AdvanceStatusButton from './advance-status-button';
import TrackingDetailTrigger from './tracking-detail-modal';
import GenerateInvoiceButton from './generate-invoice-button';
import CreateManifestForm from './create-manifest-form';
import ManifestDetailTrigger from './manifest-detail-modal';
import RecordPodForm from './record-pod-form';
import CreateReturnForm from './create-return-form';
import ReturnStatusSwitch from './return-status-switch';
import PodStatusSwitch from './pod-status-switch';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

const TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'manifests', label: 'Manifests' },
  { key: 'pod', label: 'Proof of delivery' },
  { key: 'returns', label: 'Returns' },
];

const DISPATCH_LANES: { label: string; status: string; next: string | null; color: string }[] = [
  { label: 'Pending', status: 'Pending', next: 'Assigned', color: '#ca8a04' },
  { label: 'Assigned', status: 'Assigned', next: 'In Transit', color: '#2563c7' },
  { label: 'In Transit', status: 'In Transit', next: 'Delivered', color: '#7c3aed' },
  { label: 'Delivered', status: 'Delivered', next: null, color: '#1f9d5c' },
];

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; tracking?: string }>;
}) {
  const { view = 'bookings', q = '', tracking = '' } = await searchParams;
  const supabase = await createClient();

  const { data: staff } = await supabase.from('profiles').select('id, full_name').order('full_name');

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(
      'id, tracking_no, customer_name, origin, destination, type, status, pickup_date, declared_value, weight, sender_name, sender_address, sender_email, sender_phone, receiver_name, receiver_address, receiver_phone, vehicle_number, driver_name, driver_phone, checked_by, dispatched_by, declared_value_customs, insurance_amount, freight_terms'
    )
    .order('pickup_date', { ascending: false });

  const bookingIds = (bookings ?? []).map((b) => b.id);

  const { data: invoicesForBookings } = bookingIds.length
    ? await supabase
        .from('invoices')
        .select('id, invoice_no, status, amount, linked_booking_id')
        .in('linked_booking_id', bookingIds)
    : { data: [] as { id: string; invoice_no: string; status: string; amount: number; linked_booking_id: string }[] };

  const invoiceIds = (invoicesForBookings ?? []).map((i) => i.id);

  const { data: invoiceItemsForInvoices } = invoiceIds.length
    ? await supabase.from('invoice_items').select('id, invoice_id, description, amount').in('invoice_id', invoiceIds)
    : { data: [] as { id: string; invoice_id: string; description: string; amount: number }[] };

  const invoiceByBookingId = new Map(
    (invoicesForBookings ?? []).map((inv) => [
      inv.linked_booking_id,
      { ...inv, items: (invoiceItemsForInvoices ?? []).filter((it) => it.invoice_id === inv.id) },
    ])
  );

  type CargoItemRow = {
    id: string;
    booking_id: string;
    description: string;
    quantity: string;
    gross_weight: string;
    unit: string;
    rate_class: string;
    chargeable_weight: string;
  };

  const { data: cargoItemsForBookings } = bookingIds.length
    ? await supabase
        .from('booking_cargo_items')
        .select('id, booking_id, description, quantity, gross_weight, unit, rate_class, chargeable_weight')
        .in('booking_id', bookingIds)
    : { data: [] as CargoItemRow[] };

  const cargoItemsByBookingId = new Map<string, CargoItemRow[]>();
  (cargoItemsForBookings ?? []).forEach((item) => {
    const existing = cargoItemsByBookingId.get(item.booking_id) ?? [];
    existing.push(item);
    cargoItemsByBookingId.set(item.booking_id, existing);
  });

  const { data: manifests } = await supabase
    .from('manifests')
    .select('id, manifest_no, driver_name, vehicle_number, route, manifest_date')
    .order('manifest_date', { ascending: false });

  const manifestIds = (manifests ?? []).map((m) => m.id);

  const { data: manifestLinks } = manifestIds.length
    ? await supabase.from('manifest_bookings').select('manifest_id, booking_id').in('manifest_id', manifestIds)
    : { data: [] as { manifest_id: string; booking_id: string }[] };

  const assignedBookingIds = new Set((manifestLinks ?? []).map((l) => l.booking_id));

  const bookingsById = new Map((bookings ?? []).map((b) => [b.id, b]));

  const bookingsByManifestId = new Map<string, NonNullable<typeof bookings>[number][]>();
  (manifestLinks ?? []).forEach((link) => {
    const b = bookingsById.get(link.booking_id);
    if (!b) return;
    const existing = bookingsByManifestId.get(link.manifest_id) ?? [];
    existing.push(b);
    bookingsByManifestId.set(link.manifest_id, existing);
  });

  const eligibleBookings = (bookings ?? []).filter((b) => !assignedBookingIds.has(b.id));

  const staffNameById = new Map((staff ?? []).map((s) => [s.id, s.full_name || 'Unnamed']));

  const { data: podRecords } = await supabase
    .from('proof_of_delivery')
    .select('id, booking_id, received_by, delivered_at, recorded_by, status')
    .order('delivered_at', { ascending: false });

  const podBookingIds = new Set((podRecords ?? []).map((p) => p.booking_id));
  const eligibleForPod = (bookings ?? []).filter((b) => b.status === 'Delivered' && !podBookingIds.has(b.id));

  const { data: returnsRecords } = await supabase
    .from('returns')
    .select('id, booking_id, reason, status, created_at, recorded_by')
    .order('created_at', { ascending: false });

  const eligibleForReturn = (bookings ?? []).filter((b) => b.status === 'Delivered');

  const filteredBookings = q
    ? (bookings ?? []).filter(
        (b) =>
          b.tracking_no?.toLowerCase().includes(q.toLowerCase()) ||
          b.customer_name?.toLowerCase().includes(q.toLowerCase())
      )
    : bookings ?? [];

  const trackedBooking = tracking
    ? (bookings ?? []).find((b) => b.tracking_no?.toLowerCase() === tracking.toLowerCase())
    : null;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Shipment Operations</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Bookings, dispatch, live tracking and manifests.
          </p>
        </div>
        {view === 'bookings' && (
          <div className="flex gap-2">
            <ExportBookingsButton bookings={bookings ?? []} />
            <NewBookingForm />
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/shipments?view=${t.key}`}
            className={`pb-2 ${view === t.key ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          Could not load bookings: {error.message}
        </p>
      )}

      {view === 'bookings' && (
        <>
          <form
            method="get"
            className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <input type="hidden" name="view" value="bookings" />
            <label className="mb-2 block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Look up a shipment
            </label>
            <div className="flex gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Tracking number or customer name"
                className="w-full max-w-sm rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Search
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1020px]">
              <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_140px_150px] items-center gap-x-6 bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <div>Tracking no.</div>
                <div>Customer</div>
                <div>Route</div>
                <div>Type</div>
                <div>Pickup</div>
                <div>Value</div>
                <div>Status</div>
                <div>Invoice</div>
              </div>

              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="grid grid-cols-[repeat(6,minmax(0,1fr))_140px_150px] items-center gap-x-6 border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
                >
                  <TrackingDetailTrigger
                    booking={b}
                    cargoItems={cargoItemsByBookingId.get(b.id) ?? []}
                    invoice={invoiceByBookingId.get(b.id) ?? null}
                  />
                  <div className="truncate text-neutral-900 dark:text-neutral-100">{b.customer_name}</div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">
                    {b.origin} &rarr; {b.destination}
                  </div>
                  <div className="text-neutral-700 dark:text-neutral-300">{b.type}</div>
                  <div className="text-neutral-700 dark:text-neutral-300">{b.pickup_date}</div>
                  <div className="text-neutral-900 dark:text-neutral-100">{nairaFmt(b.declared_value)}</div>
                  <div>
                    <StatusSwitch id={b.id} status={b.status} />
                  </div>
                  <GenerateInvoiceButton bookingId={b.id} compact />
                </div>
              ))}

              {!filteredBookings.length && !error && (
                <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">
                  {q ? 'No bookings match that search.' : 'No bookings yet. Create one to get started.'}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === 'dispatch' && (
        <div>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Move a shipment forward as it progresses through dispatch.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {DISPATCH_LANES.map((lane) => {
              const items = (bookings ?? []).filter((b) => b.status === lane.status);
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
                  {items.map((b) => (
                    <div
                      key={b.id}
                      className="mb-2 rounded-lg border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-800"
                    >
                      <div className="font-mono text-xs text-red-600">{b.tracking_no}</div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {b.customer_name}
                      </div>
                      <div className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {b.origin} &rarr; {b.destination}
                      </div>
                      {lane.next && <AdvanceStatusButton id={b.id} nextStatus={lane.next} />}
                    </div>
                  ))}
                  {!items.length && (
                    <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-600">
                      Nothing here
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'tracking' && (
        <div>
          <form
            method="get"
            className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <input type="hidden" name="view" value="tracking" />
            <label className="mb-2 block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Tracking number
            </label>
            <div className="flex gap-2">
              <input
                name="tracking"
                defaultValue={tracking}
                placeholder="e.g. JAAD/3007/2026/00233"
                className="w-full max-w-sm rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Track
              </button>
            </div>
          </form>

          {tracking && !trackedBooking && (
            <p className="text-sm text-neutral-400 dark:text-neutral-600">
              No shipment found with that tracking number.
            </p>
          )}

          {trackedBooking && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-sm text-red-600">{trackedBooking.tracking_no}</span>
                <StatusSwitch id={trackedBooking.id} status={trackedBooking.status} />
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">Customer</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">{trackedBooking.customer_name}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">Route</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">
                    {trackedBooking.origin} &rarr; {trackedBooking.destination}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">Type</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">{trackedBooking.type}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">Pickup</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">{trackedBooking.pickup_date}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}

      {view === 'manifests' && (
        <div>
          <div className="mb-4 flex justify-end">
            <CreateManifestForm eligibleBookings={eligibleBookings} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_100px] items-center gap-x-6 bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <div>Manifest no.</div>
                <div>Date</div>
                <div>Driver</div>
                <div>Vehicle</div>
                <div>Route</div>
                <div>Shipments</div>
              </div>

              {(manifests ?? []).map((m) => {
                const linkedBookings = bookingsByManifestId.get(m.id) ?? [];
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[repeat(5,minmax(0,1fr))_100px] items-center gap-x-6 border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
                  >
                    <ManifestDetailTrigger manifest={m} bookings={linkedBookings} />
                    <div className="text-neutral-700 dark:text-neutral-300">{m.manifest_date}</div>
                    <div className="text-neutral-700 dark:text-neutral-300">{m.driver_name || '\u2014'}</div>
                    <div className="text-neutral-700 dark:text-neutral-300">{m.vehicle_number || '\u2014'}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{m.route || '\u2014'}</div>
                    <div className="text-neutral-900 dark:text-neutral-100">{linkedBookings.length}</div>
                  </div>
                );
              })}

              {!manifests?.length && (
                <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">
                  No manifests yet. Create one to group shipments for a driver's trip.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'pod' && (
        <div>
          <div className="mb-4 flex justify-end">
            <RecordPodForm eligibleBookings={eligibleForPod} staff={staff ?? []} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_180px_110px] items-center gap-x-6 bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <div>Tracking no.</div>
                <div>Customer</div>
                <div>Received by</div>
                <div>Staff</div>
                <div>Delivered at</div>
                <div className="text-right">Status</div>
              </div>

              {(podRecords ?? []).map((p) => {
                const b = bookingsById.get(p.booking_id);
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-[repeat(4,minmax(0,1fr))_180px_110px] items-center gap-x-6 border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
                  >
                    <div className="truncate font-mono text-red-600">{b?.tracking_no ?? '\u2014'}</div>
                    <div className="truncate text-neutral-900 dark:text-neutral-100">
                      {b?.customer_name ?? '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{p.received_by}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {p.recorded_by ? staffNameById.get(p.recorded_by) ?? '\u2014' : '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {new Date(p.delivered_at).toLocaleString()}
                    </div>
                    <div className="flex justify-end">
                      <PodStatusSwitch id={p.id} status={p.status} />
                    </div>
                  </div>
                );
              })}

              {!podRecords?.length && (
                <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">
                  Nothing to show yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'returns' && (
        <div>
          <div className="mb-4 flex justify-end">
            <CreateReturnForm eligibleBookings={eligibleForReturn} staff={staff ?? []} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_180px_110px] items-center gap-x-6 bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <div>Tracking no.</div>
                <div>Customer</div>
                <div>Reason</div>
                <div>Staff</div>
                <div>Date</div>
                <div className="text-right">Status</div>
              </div>

              {(returnsRecords ?? []).map((r) => {
                const b = bookingsById.get(r.booking_id);
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[repeat(4,minmax(0,1fr))_180px_110px] items-center gap-x-6 border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800"
                  >
                    <div className="truncate font-mono text-red-600">{b?.tracking_no ?? '\u2014'}</div>
                    <div className="truncate text-neutral-900 dark:text-neutral-100">
                      {b?.customer_name ?? '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">{r.reason}</div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {r.recorded_by ? staffNameById.get(r.recorded_by) ?? '\u2014' : '\u2014'}
                    </div>
                    <div className="truncate text-neutral-700 dark:text-neutral-300">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="flex justify-end">
                      <ReturnStatusSwitch id={r.id} status={r.status} />
                    </div>
                  </div>
                );
              })}

              {!returnsRecords?.length && (
                <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-600">
                  No returns logged.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
