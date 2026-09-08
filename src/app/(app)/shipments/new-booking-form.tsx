'use client';

import { useRef, useState, useTransition } from 'react';
import { createBooking } from './actions';

type CargoItem = {
  description: string;
  quantity: string;
  gross_weight: string;
  unit: string;
  rate_class: string;
  chargeable_weight: string;
};

const emptyItem = (): CargoItem => ({
  description: '',
  quantity: '',
  gross_weight: '',
  unit: '',
  rate_class: '',
  chargeable_weight: '',
});

export default function NewBookingForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CargoItem[]>([emptyItem()]);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        + New booking
      </button>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
  const labelClass = 'mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400';
  const sectionLabel =
    'mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';

  function updateItem(index: number, field: keyof CargoItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-8">
      <form
        ref={formRef}
        action={(fd) => {
          setError(null);
          fd.set('cargo_items', JSON.stringify(items));
          startTransition(async () => {
            const res = await createBooking(fd);
            if (res?.error) {
              setError(res.error);
            } else {
              setOpen(false);
              formRef.current?.reset();
              setItems([emptyItem()]);
            }
          });
        }}
        className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-neutral-900"
      >
        <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">New booking</h3>

        <div className={sectionLabel}>Shipment</div>
        <label className={labelClass}>Customer name</label>
        <input name="customer_name" required className={`mb-3 ${inputClass}`} />

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Origin</label>
            <input name="origin" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <input name="destination" required className={inputClass} />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Type</label>
            <select name="type" className={inputClass}>
              <option>Road</option>
              <option>Haulage</option>
              <option>Air</option>
              <option>Sea</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Pickup date</label>
            <input type="date" name="pickup_date" required className={inputClass} />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Weight</label>
            <input name="weight" placeholder="e.g. 2.4t" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Declared value, NGN</label>
            <input type="number" name="declared_value" className={inputClass} />
          </div>
        </div>

        <div className={sectionLabel}>Sender (Consignor)</div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Name</label>
            <input name="sender_name" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="sender_phone" className={inputClass} />
          </div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Address</label>
            <input name="sender_address" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="sender_email" type="email" className={inputClass} />
          </div>
        </div>

        <div className={sectionLabel}>Receiver (Consignee)</div>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Name</label>
            <input name="receiver_name" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="receiver_phone" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Address</label>
            <input name="receiver_address" className={inputClass} />
          </div>
        </div>

        <div className={sectionLabel}>Cargo items</div>
        <div className="mb-2 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-6 gap-1.5 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
              <input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                className={`col-span-2 ${inputClass} px-2 py-1.5 text-xs`}
              />
              <input
                placeholder="Qty / pieces"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                className={`${inputClass} px-2 py-1.5 text-xs`}
              />
              <input
                placeholder="Gross weight"
                value={item.gross_weight}
                onChange={(e) => updateItem(i, 'gross_weight', e.target.value)}
                className={`${inputClass} px-2 py-1.5 text-xs`}
              />
              <input
                placeholder="Unit"
                value={item.unit}
                onChange={(e) => updateItem(i, 'unit', e.target.value)}
                className={`${inputClass} px-2 py-1.5 text-xs`}
              />
              <div className="flex gap-1">
                <input
                  placeholder="Rate class"
                  value={item.rate_class}
                  onChange={(e) => updateItem(i, 'rate_class', e.target.value)}
                  className={`${inputClass} px-2 py-1.5 text-xs`}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="px-1 text-neutral-400 hover:text-red-600"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mb-5 text-xs font-semibold text-red-600 hover:underline"
        >
          + Add item
        </button>

        <div className={sectionLabel}>Transport</div>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Vehicle number</label>
            <input name="vehicle_number" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Driver name</label>
            <input name="driver_name" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Driver phone</label>
            <input name="driver_phone" className={inputClass} />
          </div>
        </div>

        <div className={sectionLabel}>Customs and freight</div>
        <div className="mb-5 grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Declared value for customs</label>
            <input name="declared_value_customs" placeholder="e.g. NCV" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Insurance amount, NGN</label>
            <input type="number" name="insurance_amount" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Freight terms</label>
            <select name="freight_terms" className={inputClass}>
              <option>Prepaid</option>
              <option>Collect</option>
            </select>
          </div>
        </div>

        <div className={sectionLabel}>Office use</div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Checked by</label>
            <input name="checked_by" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Dispatched by</label>
            <input name="dispatched_by" className={inputClass} />
          </div>
        </div>

        <p className="mb-3 rounded-lg bg-neutral-100 p-2 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          Tracking number is generated by the database from the pickup date, the same JAAD/date/sequence
          format as before, so it can never be spoofed from the browser.
        </p>

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? 'Creating...' : 'Create booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
