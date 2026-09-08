'use client';

import { useState } from 'react';
import StatusSwitch from './status-switch';
import GenerateInvoiceButton from './generate-invoice-button';
import RoadWaybill from './road-waybill';
import AirWaybill from './air-waybill';

type CargoItem = {
  id: string;
  description: string;
  quantity: string;
  gross_weight: string;
  unit: string;
  rate_class: string;
  chargeable_weight: string;
};

type Invoice = { id: string; invoice_no: string; status: string };

type Booking = {
  id: string;
  tracking_no: string;
  customer_name: string;
  origin: string;
  destination: string;
  type: string;
  status: string;
  pickup_date: string;
  declared_value: number;
  weight?: string | null;
  sender_name?: string | null;
  sender_address?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
  receiver_name?: string | null;
  receiver_address?: string | null;
  receiver_phone?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  checked_by?: string | null;
  dispatched_by?: string | null;
  declared_value_customs?: string | null;
  insurance_amount?: number | null;
  freight_terms?: string | null;
};

const PAYMENT_STYLE: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
};

export default function TrackingDetailTrigger({
  booking,
  cargoItems,
  invoice,
}: {
  booking: Booking;
  cargoItems: CargoItem[];
  invoice: Invoice | null;
}) {
  const [open, setOpen] = useState(false);
  const isAir = booking.type === 'Air';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="truncate text-left font-mono text-red-600 hover:underline"
      >
        {booking.tracking_no}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-8"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-neutral-900 px-5 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-red-500">{booking.tracking_no}</span>
                <StatusSwitch id={booking.id} status={booking.status} />
              </div>
              <div className="flex items-center gap-3">
                {invoice ? (
                  <a
                    href={`/finance/invoices/${invoice.id}`}
                    className="flex items-center gap-2 text-xs font-semibold text-neutral-200 hover:text-white"
                  >
                    <span className="font-mono">{invoice.invoice_no}</span>
                    <span className={`rounded-full px-2 py-0.5 ${PAYMENT_STYLE[invoice.status] ?? PAYMENT_STYLE.Pending}`}>
                      {invoice.status}
                    </span>
                  </a>
                ) : (
                  <div className="w-36">
                    <GenerateInvoiceButton bookingId={booking.id} compact />
                  </div>
                )}
                <button onClick={() => setOpen(false)} className="text-sm text-neutral-400 hover:text-white">
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto rounded-xl bg-white p-8 shadow-2xl">
              {isAir ? (
                <AirWaybill booking={booking} cargoItems={cargoItems} />
              ) : (
                <RoadWaybill booking={booking} cargoItems={cargoItems} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
