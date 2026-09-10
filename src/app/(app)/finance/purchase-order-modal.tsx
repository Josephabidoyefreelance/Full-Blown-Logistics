'use client';

import { useState } from 'react';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function statusColor(status: string) {
  if (status === 'Received') return { text: 'text-green-600', border: 'border-green-600' };
  return { text: 'text-amber-600', border: 'border-amber-600' };
}

export default function PurchaseOrderModal({
  poNo,
  supplier,
  description,
  total,
  date,
  status,
}: {
  poNo: string;
  supplier: string;
  description: string | null;
  total: number;
  date: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const VAT_RATE = 0.075;
  const subtotal = total;
  const vat = Math.round(subtotal * VAT_RATE);
  const grandTotal = subtotal + vat;
  const colors = statusColor(status);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <button onClick={() => setOpen(true)} className="font-mono text-red-700 hover:underline dark:text-red-500">
        {poNo}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 print:bg-white">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .finance-print-area, .finance-print-area * { visibility: visible; }
              .finance-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
            }
          `}</style>

          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Purchase order, {poNo}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="finance-print-area p-6">
              <div className="mb-6">
                <img src="/logo.png" alt="JAAD Logistics" className="h-9 w-9 rounded" />
                <div className="mt-1 text-xs text-neutral-500">info@jaadlogistics.com</div>
              </div>

              <h3 className="mb-4 text-lg font-bold text-neutral-900">Purchase order</h3>

              <div className="mb-5 flex items-start justify-between text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Supplier</div>
                  <div className="font-semibold text-neutral-900">{supplier}</div>
                  <div className="font-mono text-neutral-500">{poNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Date</div>
                  <div className="font-semibold text-neutral-900">{date}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-wide text-neutral-400">Status</div>
                  <div className={`font-semibold ${colors.text}`}>{status}</div>
                </div>
              </div>

              {description && (
                <div className="mb-6 text-sm">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400">Description</div>
                  <div className="text-neutral-700">{description}</div>
                </div>
              )}

              <div className="mb-4 flex justify-center py-2">
                <div
                  className={`select-none rounded border-4 px-4 py-1.5 text-lg font-black uppercase tracking-widest ${colors.border} ${colors.text}`}
                  style={{ opacity: 0.75 }}
                >
                  {status}
                </div>
              </div>

              <div className="space-y-2 border-t border-neutral-200 pt-4 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span>{nairaFmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>VAT, 7.5%</span>
                  <span>{nairaFmt(vat)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-bold">
                  <span className="text-neutral-900">Total</span>
                  <span className="text-neutral-900">{nairaFmt(grandTotal)}</span>
                </div>
              </div>

              <div className="mt-10 flex items-end justify-between text-xs">
                <div className="w-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/signature.jpg" alt="Signature" className="mb-1 h-10 w-24 object-contain" />
                  <div className="border-t border-neutral-300 pt-1 text-neutral-500">Approved by, Procurement</div>
                </div>
                <div className="w-32">
                  <div className="mb-1 h-10"></div>
                  <div className="border-t border-neutral-300 pt-1 text-neutral-500">Received by, Supplier</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-neutral-400">Date: {today}</div>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Download
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
