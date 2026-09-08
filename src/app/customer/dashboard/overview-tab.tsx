'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DonutChart from './donut-chart';
import ShipmentDetailTrigger from './shipment-detail-modal';

type Booking = {
  id: string;
  tracking_no: string | null;
  origin: string;
  destination: string;
  status: string;
};

type Invoice = { amount: number };

const STATUS_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Assigned: '#2563c7',
  'In Transit': '#7c3aed',
  Delivered: '#1f9d5c',
  Cancelled: '#ff6b60',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#9a9aa0',
  Medium: '#ca8a04',
  High: '#b8140d',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#9a9aa0';
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: color + '1a', color }}
    >
      {status}
    </span>
  );
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function lastSixMonthBuckets() {
  const buckets: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d) });
  }
  return buckets;
}

function MiniTrendBars({ title, bars }: { title: string; bars: { label: string; value: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
      <h4 className="mb-4 text-sm font-bold text-[var(--text)]">{title}</h4>
      <div className="flex h-32 items-end gap-2">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="text-[11px] font-semibold text-[var(--text)]">{b.value}</div>
            <div
              className="w-full rounded-t-sm bg-[#e5231b]"
              style={{ height: `${Math.max(4, (b.value / max) * 88)}px` }}
            />
            <div className="text-[10px] text-[var(--subtext)]">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverviewTab({
  bookings,
  invoices,
  ownInvoiceTotals,
  currency,
  cargoItemsByBookingId,
  onGoToTab,
}: {
  bookings: Booking[];
  invoices: Invoice[];
  ownInvoiceTotals: { subtotal: number; tax: number; total: number };
  currency: string;
  cargoItemsByBookingId: Record<string, any[]>;
  onGoToTab: (tab: string) => void;
}) {
  const supabase = createClient();

  const [leadCounts, setLeadCounts] = useState({ Low: 0, Medium: 0, High: 0 });
  const [inventoryCounts, setInventoryCounts] = useState({ inStock: 0, lowStock: 0 });
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [invoiceStatusCounts, setInvoiceStatusCounts] = useState({ paid: 0, unpaid: 0 });
  const [invoicesByMonth, setInvoicesByMonth] = useState<{ label: string; value: number }[]>([]);
  const [shipmentsByMonth, setShipmentsByMonth] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: leads }, { data: items }, { data: ownInvoices }, { data: bookingDates }] = await Promise.all([
        supabase.from('customer_leads').select('priority'),
        supabase.from('customer_inventory').select('quantity, reorder_threshold'),
        supabase.from('customer_own_invoices').select('status, created_at'),
        supabase.from('bookings').select('pickup_date'),
      ]);

      const lc = { Low: 0, Medium: 0, High: 0 };
      (leads ?? []).forEach((l: any) => {
        if (lc[l.priority as keyof typeof lc] !== undefined) lc[l.priority as keyof typeof lc]++;
      });
      setLeadCounts(lc);

      let inStock = 0;
      let lowStock = 0;
      (items ?? []).forEach((it: any) => {
        if (it.quantity <= it.reorder_threshold) lowStock++;
        else inStock++;
      });
      setInventoryCounts({ inStock, lowStock });

      let paid = 0;
      let unpaid = 0;
      const buckets = lastSixMonthBuckets();
      const invMonthMap: Record<string, number> = {};
      buckets.forEach((b) => (invMonthMap[b.key] = 0));
      (ownInvoices ?? []).forEach((inv: any) => {
        if (inv.status === 'Paid') paid++;
        else unpaid++;
        if (inv.created_at) {
          const d = new Date(inv.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (invMonthMap[key] !== undefined) invMonthMap[key]++;
        }
      });
      setInvoiceStatusCounts({ paid, unpaid });
      setInvoicesByMonth(buckets.map((b) => ({ label: b.label, value: invMonthMap[b.key] })));

      const shipMonthMap: Record<string, number> = {};
      buckets.forEach((b) => (shipMonthMap[b.key] = 0));
      (bookingDates ?? []).forEach((bk: any) => {
        if (bk.pickup_date) {
          const d = new Date(bk.pickup_date);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (shipMonthMap[key] !== undefined) shipMonthMap[key]++;
        }
      });
      setShipmentsByMonth(buckets.map((b) => ({ label: b.label, value: shipMonthMap[b.key] })));

      setLoadingSummaries(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shipmentStatusCounts = ['Pending', 'Assigned', 'In Transit', 'Delivered', 'Cancelled'].map((s) => ({
    label: s,
    value: bookings.filter((b) => b.status === s).length,
    color: STATUS_COLORS[s],
  }));
  const totalShipments = bookings.length;

  const leadSegments = ['Low', 'Medium', 'High'].map((p) => ({
    label: p,
    value: leadCounts[p as keyof typeof leadCounts],
    color: PRIORITY_COLORS[p],
  }));
  const totalLeads = leadCounts.Low + leadCounts.Medium + leadCounts.High;

  const inventorySegments = [
    { label: 'In stock', value: inventoryCounts.inStock, color: '#16a34a' },
    { label: 'Low stock', value: inventoryCounts.lowStock, color: '#dc2626' },
  ];
  const totalInventory = inventoryCounts.inStock + inventoryCounts.lowStock;

  const totalInvoicesForTrend = invoiceStatusCounts.paid + invoiceStatusCounts.unpaid;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutChart title="Shipments by status" total={totalShipments} segments={shipmentStatusCounts} />
        <DonutChart title="Leads by priority" total={totalLeads} segments={leadSegments} />
        <DonutChart title="Inventory by status" total={totalInventory} segments={inventorySegments} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutChart
          title="Invoices paid vs unpaid"
          total={totalInvoicesForTrend}
          segments={[
            { label: 'Paid', value: invoiceStatusCounts.paid, color: '#1f9d5c' },
            { label: 'Unpaid', value: invoiceStatusCounts.unpaid, color: '#e2362b' },
          ]}
        />
        <MiniTrendBars title="Invoices created, last 6 months" bars={invoicesByMonth} />
        <MiniTrendBars title="Shipments booked, last 6 months" bars={shipmentsByMonth} />
      </div>

      {!loadingSummaries && totalInventory === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-center text-[13px] text-[var(--subtext)]">
          No inventory items yet.{' '}
          <button onClick={() => onGoToTab('inventory')} className="font-semibold text-[#e5231b]">
            Add your first item
          </button>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text)]">Recent shipments</h3>
          <button onClick={() => onGoToTab('shipments')} className="text-[12px] font-semibold text-[#e5231b]">
            View all
          </button>
        </div>
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--subtext)]">
            Your recent shipments will show up here once your first booking is placed.
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
                <div>
                  <ShipmentDetailTrigger booking={b as any} cargoItems={cargoItemsByBookingId[b.id] ?? []} />
                  <div className="text-[13px] text-[var(--text)]">
                    {b.origin} &rarr; {b.destination}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
