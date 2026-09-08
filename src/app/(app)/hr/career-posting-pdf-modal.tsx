'use client';

import { useState } from 'react';
import Link from 'next/link';
import RemovePostingButton from './remove-posting-button';

export default function CareerPostingCard({
  id,
  title,
  location,
  employmentType,
  description,
}: {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold uppercase text-neutral-900 dark:text-neutral-100">{title}</h3>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {location} &middot; {employmentType}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            View / Download PDF
          </button>
          <RemovePostingButton id={id} title={title} />
        </div>
      </div>
      <p className="line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/careers/${id}`}
          target="_blank"
          className="text-xs font-medium text-red-700 hover:underline dark:text-red-500"
        >
          Public apply link &rarr;
        </Link>
      </div>

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
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
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
                <div className="text-xl font-bold tracking-wide text-white">CAREERS</div>
              </div>

              <div className="p-6">
                <h3 className="mb-1 text-xl font-bold uppercase text-neutral-900">{title}</h3>
                <div className="mb-5 text-sm text-neutral-500">
                  {location} &middot; {employmentType}
                </div>

                <div className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{description}</div>

                <div className="mt-8 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400">
                  To apply, send your CV and cover letter to careers@jaadlogistics.com.ng
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
    </div>
  );
}
