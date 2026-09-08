'use client';

import { useState } from 'react';
import Image from 'next/image';

type ManifestBooking = {
  id: string;
  tracking_no: string;
  customer_name: string;
  origin: string;
  destination: string;
};

type Manifest = {
  id: string;
  manifest_no: string;
  driver_name: string | null;
  vehicle_number: string | null;
  route: string | null;
  manifest_date: string;
};

export default function ManifestDetailTrigger({
  manifest,
  bookings,
}: {
  manifest: Manifest;
  bookings: ManifestBooking[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-left font-mono text-red-600 hover:underline">
        {manifest.manifest_no}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-8"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-8 py-4">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="JAAD Logistics" width={36} height={36} className="rounded" />
                <div>
                  <div className="text-sm font-bold text-neutral-900">JAAD Logistics Ltd</div>
                  <div className="text-xs text-neutral-500">Dispatch manifest</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-600">
                Close
              </button>
            </div>

            <div className="px-8 py-6 text-neutral-900">
              <div className="mb-1 font-mono text-lg font-bold text-red-600">{manifest.manifest_no}</div>
              <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">Date: </span>
                  <span className="font-medium">{manifest.manifest_date}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Route: </span>
                  <span className="font-medium">{manifest.route || '\u2014'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Driver: </span>
                  <span className="font-medium">{manifest.driver_name || '\u2014'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Vehicle: </span>
                  <span className="font-medium">{manifest.vehicle_number || '\u2014'}</span>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-[11px] uppercase text-neutral-500">
                    <th className="py-2">Tracking no.</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2">Route</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-neutral-100">
                      <td className="py-2.5 font-mono text-red-600">{b.tracking_no}</td>
                      <td className="py-2.5">{b.customer_name}</td>
                      <td className="py-2.5 text-neutral-700">
                        {b.origin} &rarr; {b.destination}
                      </td>
                    </tr>
                  ))}
                  {!bookings.length && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-neutral-400">
                        No shipments linked to this manifest.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
