'use client';

import { useState } from 'react';

export default function OfferLetterModal({
  name,
  department,
  roleTitle,
}: {
  name: string;
  department: string;
  roleTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-red-700 hover:underline dark:text-red-500">
        View offer letter
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
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Offer letter, {name}</h2>
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
                <div className="text-xl font-bold tracking-wide text-white">OFFER LETTER</div>
              </div>

              <div className="p-6 text-sm leading-relaxed text-neutral-700">
                <div className="mb-6 text-neutral-500">
                  <div>JAAD Logistics Ltd</div>
                  <div>Lagos State, Nigeria</div>
                  <div>admin@jaadlogistics.com.ng</div>
                </div>

                <div className="mb-6 text-neutral-500">{today}</div>

                <p className="mb-4">Dear {name},</p>

                <p className="mb-4">
                  We are pleased to offer you the position of <strong>{roleTitle}</strong> in the{' '}
                  <strong>{department}</strong> department at JAAD Logistics Ltd. This letter confirms the terms of
                  your engagement with us.
                </p>

                <p className="mb-4">
                  Your role will involve responsibilities consistent with the position of {roleTitle}, reporting to
                  the relevant departmental head. Your employment is subject to JAAD Logistics&apos; internal
                  policies, code of conduct, and applicable Nigerian labour law.
                </p>

                <p className="mb-8">
                  We look forward to your contribution to the team and to a long and mutually beneficial working
                  relationship.
                </p>

                <div className="mb-2">Yours sincerely,</div>

                <div className="mt-8 w-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/signature.jpg" alt="Signature" className="mb-1 h-10 w-24 object-contain" />
                  <div className="border-t border-neutral-300 pt-1 text-xs text-neutral-500">HR &amp; Careers, JAAD Logistics</div>
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
