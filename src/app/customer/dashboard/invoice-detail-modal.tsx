'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type InvoiceItemRow = { id: string; description: string; amount: number };

type Invoice = {
  id: string;
  invoice_no: string;
  status: string;
  amount: number;
};

type Booking = {
  origin: string;
  destination: string;
  tracking_no: string | null;
};

export default function InvoiceDetailTrigger({
  invoice,
  booking,
  customerName,
}: {
  invoice: Invoice;
  booking: Booking | null;
  customerName: string | null;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItemRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function openModal() {
    setOpen(true);
    if (items !== null) return;
    setLoading(true);
    const { data } = await supabase
      .from('invoice_items')
      .select('id, description, amount')
      .eq('invoice_id', invoice.id);
    setItems(data ?? []);
    setLoading(false);
  }

  function handlePrint() {
    window.print();
  }

  const subtotal = items && items.length > 0
    ? items.reduce((sum, it) => sum + (it.amount || 0), 0)
    : invoice.amount || 0;

  const issueDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <button onClick={openModal} className="text-left text-sm font-semibold text-[var(--text)] hover:underline">
        {invoice.invoice_no}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8 print:bg-white print:p-0"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[640px] overflow-hidden rounded-lg border border-[var(--border)] bg-white p-8 text-black print:w-[210mm] print:max-w-none print:rounded-none print:border-0 print:p-10 print:shadow-none"
          >
            <div className="mb-6 flex items-center justify-between print:hidden">
              <span className="text-sm font-bold text-neutral-900">Shipment invoice</span>
              <div className="flex items-center gap-4">
                <button onClick={handlePrint} className="text-[13px] font-semibold text-[#e5231b]">
                  Print
                </button>
                <button onClick={handlePrint} className="text-[13px] font-semibold text-[#e5231b]">
                  Download PDF
                </button>
                <button onClick={() => setOpen(false)} className="text-[13px] font-semibold text-neutral-500">
                  Close
                </button>
              </div>
            </div>

            <div
              className="pointer-events-none absolute right-10 top-32 z-10 select-none rounded-md border-4 px-4 py-1.5 text-lg font-black uppercase tracking-widest opacity-90"
              style={{
                color: invoice.status === 'Paid' ? '#1f9d5c' : '#ca8a04',
                borderColor: invoice.status === 'Paid' ? '#1f9d5c' : '#ca8a04',
                transform: 'rotate(-14deg)',
              }}
            >
              {invoice.status}
            </div>

            <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="JAAD Logistics" width={44} height={44} />
                <div>
                  <div className="text-lg font-bold leading-tight text-neutral-900">JAAD Logistics</div>
                  <div className="text-[12px] text-neutral-500">Haulage &amp; Freight</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold uppercase tracking-wide text-neutral-900">Invoice</div>
                <div className="text-[12px] text-neutral-500">{invoice.invoice_no}</div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Billed to</div>
                <div className="mt-0.5 font-medium text-neutral-900">{customerName ?? '\u2014'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Date issued</div>
                <div className="mt-0.5 font-medium text-neutral-900">{issueDate}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Status</div>
                <div className="mt-0.5">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: invoice.status === 'Paid' ? '#1f9d5c1a' : '#ca8a041a',
                      color: invoice.status === 'Paid' ? '#1f9d5c' : '#ca8a04',
                    }}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>

            {booking && (
              <div className="mb-6 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Shipment</div>
                <div className="mt-0.5 font-medium text-neutral-900">
                  {booking.tracking_no ?? '\u2014'} &middot; {booking.origin} &rarr; {booking.destination}
                </div>
              </div>
            )}

            <div className="mb-6 overflow-hidden rounded-md border border-neutral-200">
              <div className="grid grid-cols-[1fr_140px] gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                <div>Description</div>
                <div className="text-right">Amount</div>
              </div>
              {loading ? (
                <div className="p-4 text-center text-sm text-neutral-500">Loading...</div>
              ) : items && items.length > 0 ? (
                items.map((it) => (
                  <div key={it.id} className="grid grid-cols-[1fr_140px] gap-2 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
                    <div className="text-neutral-900">{it.description}</div>
                    <div className="text-right text-neutral-900">
                      {'\u20a6'}{(it.amount || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-[1fr_140px] gap-2 px-4 py-3 text-sm">
                  <div className="text-neutral-900">Shipment charge</div>
                  <div className="text-right text-neutral-900">
                    {'\u20a6'}{(invoice.amount || 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8 flex justify-end">
              <div className="w-full max-w-[240px] space-y-1.5 text-sm">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span>{'\u20a6'}{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold text-neutral-900">
                  <span>Total due</span>
                  <span>{'\u20a6'}{(invoice.amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-400">
              Thank you for shipping with JAAD Logistics.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
