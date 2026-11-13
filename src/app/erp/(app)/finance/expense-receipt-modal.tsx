'use client';

import { useState } from 'react';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

export default function ExpenseReceiptModal({
  category,
  vendor,
  amount,
  date,
  status,
}: {
  category: string;
  vendor: string;
  amount: number;
  date: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const isPaid = status === 'Paid';
  const stampColor = isPaid ? 'text-green-600 border-green-600' : 'text-amber-600 border-amber-600';
  const statusColor = isPaid ? 'text-green-600' : 'text-amber-600';

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-red-700 hover:underline dark:text-red-500">
        {category}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Expense receipt</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="finance-print-area">
              <div className="flex items-center justify-between bg-black px-6 py-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="JAAD Logistics" className="h-10 w-10 rounded" />
                <div className="text-xl font-bold tracking-wide text-white">EXPENSE RECEIPT</div>
              </div>

              <div className="p-6">
                <div className="mb-6 flex items-start justify-between text-sm">
                  <div>
                    <div className="font-bold text-neutral-900">JAAD LOGISTICS</div>
                    <div className="text-neutral-500">Lagos State, Nigeria</div>
                    <div className="text-neutral-500">+234-707-568-8573</div>
                    <div className="text-neutral-500">admin@jaadlogistics.com.ng</div>
                    <div className="text-neutral-500">www.jaadlogistics.com.ng</div>
                  </div>
                  <div className="text-right">
                    <div><span className="text-neutral-500">Date: </span><span className="font-semibold text-neutral-900">{date}</span></div>
                    <div><span className="text-neutral-500">Status: </span><span className={`font-semibold ${statusColor}`}>{status}</span></div>
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-neutral-200">
                  <div className="bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                    Paid to
                  </div>
                  <div className="px-4 py-3 text-sm text-neutral-700">{vendor}</div>
                </div>

                <div className="mb-6 overflow-hidden rounded-lg border border-neutral-200">
                  <div className="grid grid-cols-[1fr_180px] bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                    <div>Description</div>
                    <div className="text-right">Amount</div>
                  </div>
                  <div className="grid grid-cols-[1fr_180px] border-t border-neutral-100 px-4 py-3 text-sm">
                    <div className="text-neutral-700">{category}</div>
                    <div className="text-right font-semibold text-neutral-900">{nairaFmt(amount)}</div>
                  </div>
                </div>

                <div className="mb-4 flex justify-center py-2">
                  <div
                    className={`select-none rounded border-4 px-4 py-1.5 text-lg font-black uppercase tracking-widest ${stampColor}`}
                    style={{ opacity: 0.75 }}
                  >
                    {isPaid ? 'Paid' : 'Unpaid'}
                  </div>
                </div>

                <div className="mb-6 flex justify-end">
                  <div className="w-56">
                    <div className="flex justify-between border-b-2 border-neutral-900 pb-2 text-base font-bold">
                      <span className="text-neutral-900">Total</span>
                      <span className="text-neutral-900">{nairaFmt(amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
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
