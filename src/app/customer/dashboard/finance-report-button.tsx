'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type InventoryItem = {
  sku: string | null;
  item_name: string;
  quantity: number;
  location: string | null;
  reorder_threshold: number;
};

type Props = {
  customerName: string | null;
  currency: string;
  symbol: string;
  revenue: number;
  tax: number;
  profit: number;
  income: number;
  activeShipments: number;
  deliveredThisMonth: number;
};

export default function FinanceReportButton({
  customerName,
  currency,
  symbol,
  revenue,
  tax,
  profit,
  income,
  activeShipments,
  deliveredThisMonth,
}: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);

  async function openReport() {
    setLoading(true);
    const { data } = await supabase
      .from('customer_inventory')
      .select('sku, item_name, quantity, location, reorder_threshold')
      .order('item_name', { ascending: true });
    setItems(data ?? []);
    setLoading(false);
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={openReport}
        disabled={loading}
        className="rounded-sm border border-[var(--input-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--text)] hover:bg-[var(--input-bg)] disabled:opacity-60"
      >
        {loading ? 'Preparing...' : 'Report'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8 print:bg-white print:p-0"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 print:border-0 print:bg-white print:text-black"
          >
            <div className="mb-5 flex items-center justify-between print:hidden">
              <span className="text-sm font-bold text-[var(--text)]">Business report</span>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="text-[13px] font-semibold text-[#e5231b]">
                  Download
                </button>
                <button onClick={() => setOpen(false)} className="text-[13px] font-semibold text-[var(--subtext)]">
                  Close
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-xl font-bold text-[var(--text)] print:text-black">
                {customerName ?? 'Customer'} — Business report
              </h1>
              <p className="text-[12px] text-[var(--subtext)] print:text-neutral-500">
                Generated {new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} &middot; Currency: {currency}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold text-[var(--text)] print:text-black">Shipments</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-[var(--border)] p-3 print:border-neutral-300">
                  <div className="text-[10px] uppercase text-[var(--subtext)] print:text-neutral-500">Active shipments</div>
                  <div className="text-lg font-bold text-[var(--text)] print:text-black">{activeShipments}</div>
                </div>
                <div className="rounded-md border border-[var(--border)] p-3 print:border-neutral-300">
                  <div className="text-[10px] uppercase text-[var(--subtext)] print:text-neutral-500">Delivered this month</div>
                  <div className="text-lg font-bold text-[var(--text)] print:text-black">{deliveredThisMonth}</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold text-[var(--text)] print:text-black">Finance</h3>
              <div className="grid grid-cols-4 gap-3 text-sm">
                {[
                  ['Revenue', revenue],
                  ['Tax (7.5%)', tax],
                  ['Profit', profit],
                  ['Income', income],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-md border border-[var(--border)] p-3 print:border-neutral-300">
                    <div className="text-[10px] uppercase text-[var(--subtext)] print:text-neutral-500">{label}</div>
                    <div className="text-base font-bold text-[var(--text)] print:text-black">
                      {symbol}{(value as number).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-[var(--text)] print:text-black">Inventory</h3>
              {items.length === 0 ? (
                <p className="text-sm text-[var(--subtext)] print:text-neutral-500">No inventory items on file.</p>
              ) : (
                <div className="overflow-hidden rounded-md border border-[var(--border)] print:border-neutral-300">
                  <div className="grid grid-cols-[1fr_1.4fr_0.7fr_1fr_1fr] gap-2 border-b border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[10px] uppercase text-[var(--subtext)] print:border-neutral-300 print:bg-neutral-100 print:text-neutral-500">
                    <div>SKU</div>
                    <div>Item</div>
                    <div className="text-right">Qty</div>
                    <div>Location</div>
                    <div>Status</div>
                  </div>
                  {items.map((it, i) => {
                    const status = it.quantity <= it.reorder_threshold ? 'Low stock' : 'In stock';
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1.4fr_0.7fr_1fr_1fr] gap-2 border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0 print:border-neutral-200"
                      >
                        <div className="text-[var(--text)] print:text-black">{it.sku ?? '—'}</div>
                        <div className="text-[var(--text)] print:text-black">{it.item_name}</div>
                        <div className="text-right text-[var(--text)] print:text-black">{it.quantity}</div>
                        <div className="text-[var(--text)] print:text-black">{it.location ?? '—'}</div>
                        <div className="text-[var(--text)] print:text-black">{status}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
