'use client';

import { useState } from 'react';
import Image from 'next/image';

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

type BookingDetail = {
  id: string;
  tracking_no: string | null;
  origin: string;
  destination: string;
  type: string;
  status: string;
  pickup_date: string | null;
  declared_value: number | null;
  weight: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Assigned: '#2563c7',
  'In Transit': '#7c3aed',
  Delivered: '#1f9d5c',
  Cancelled: '#b8140d',
};

export default function ShipmentDetailTrigger({
  booking,
  cargoItems,
}: {
  booking: BookingDetail;
  cargoItems: CargoItemRow[];
}) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[booking.status] ?? '#9a9aa0';

  const issueDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="truncate text-left font-mono text-[12px] text-[#e5231b] hover:underline"
      >
        {booking.tracking_no ?? 'Pending assignment'}
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
              <span className="text-sm font-bold text-neutral-900">Shipment note</span>
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

            {/* status stamp, rotated, watermark-style */}
            <div
              className="pointer-events-none absolute right-10 top-32 z-10 select-none rounded-md border-4 px-4 py-1.5 text-lg font-black uppercase tracking-widest opacity-90"
              style={{
                color,
                borderColor: color,
                transform: 'rotate(-14deg)',
              }}
            >
              {booking.status}
            </div>

            {/* letterhead */}
            <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="JAAD Logistics" width={44} height={44} />
                <div>
                  <div className="text-lg font-bold leading-tight text-neutral-900">JAAD Logistics</div>
                  <div className="text-[12px] text-neutral-500">Haulage &amp; Freight</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold uppercase tracking-wide text-neutral-900">Shipment note</div>
                <div className="text-[12px] text-neutral-500">{booking.tracking_no ?? '\u2014'}</div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Date</div>
                <div className="mt-0.5 font-medium text-neutral-900">{issueDate}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Type</div>
                <div className="mt-0.5 font-medium text-neutral-900">{booking.type}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Pickup date</div>
                <div className="mt-0.5 font-medium text-neutral-900">{booking.pickup_date ?? '\u2014'}</div>
              </div>
            </div>

            <div className="mb-6 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Route</div>
              <div className="mt-0.5 font-medium text-neutral-900">
                {booking.origin} &rarr; {booking.destination}
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Weight</div>
                <div className="mt-0.5 font-medium text-neutral-900">{booking.weight ?? '\u2014'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Declared value</div>
                <div className="mt-0.5 font-medium text-neutral-900">
                  {booking.declared_value ? `\u20a6${booking.declared_value.toLocaleString()}` : '\u2014'}
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-md border border-neutral-200 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Sender</div>
                <div className="text-sm font-medium text-neutral-900">{booking.sender_name ?? '\u2014'}</div>
                <div className="text-[12px] text-neutral-500">{booking.sender_phone ?? ''}</div>
                <div className="text-[12px] text-neutral-500">{booking.sender_address ?? ''}</div>
              </div>
              <div className="rounded-md border border-neutral-200 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Receiver</div>
                <div className="text-sm font-medium text-neutral-900">{booking.receiver_name ?? '\u2014'}</div>
                <div className="text-[12px] text-neutral-500">{booking.receiver_phone ?? ''}</div>
                <div className="text-[12px] text-neutral-500">{booking.receiver_address ?? ''}</div>
              </div>
            </div>

            {cargoItems.length > 0 && (
              <div className="mb-6 overflow-hidden rounded-md border border-neutral-200">
                <div className="grid grid-cols-4 gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  <div className="col-span-2">Description</div>
                  <div>Qty</div>
                  <div>Weight</div>
                </div>
                {cargoItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-4 gap-2 border-b border-neutral-100 px-4 py-3 text-[13px] last:border-b-0"
                  >
                    <div className="col-span-2 text-neutral-900">{item.description}</div>
                    <div className="text-neutral-500">{item.quantity}</div>
                    <div className="text-neutral-500">
                      {item.gross_weight} {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-400">
              Thank you for shipping with JAAD Logistics.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
