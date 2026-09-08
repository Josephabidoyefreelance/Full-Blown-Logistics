'use client';

import { useRef, useState, useTransition } from 'react';
import { createCustomerBooking } from './customer-booking-actions';

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

type Props = {
  onBooked?: () => void;
  initialItem?: Partial<CargoItem>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export default function BookShipmentForm({ onBooked, initialItem, open, onOpenChange, hideTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<CargoItem[]>([{ ...emptyItem(), ...initialItem }]);
  const formRef = useRef<HTMLFormElement>(null);

  const inputClass =
    'w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]';
  const labelClass = 'mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]';
  const sectionLabel = 'mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--subtext)]';

  function updateItem(index: number, field: keyof CargoItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function closeAndReset() {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setItems([{ ...emptyItem(), ...initialItem }]);
    formRef.current?.reset();
  }

  if (!isOpen) {
    if (hideTrigger) return null;
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#c91d16]"
      >
        + Book shipment
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
      <form
        ref={formRef}
        action={(fd) => {
          setError(null);
          fd.set('cargo_items', JSON.stringify(items));
          startTransition(async () => {
            const res = await createCustomerBooking(fd);
            if (res?.error) {
              setError(res.error);
            } else {
              setSuccess(res?.tracking_no ? `Booked. Tracking number: ${res.tracking_no}` : 'Booked.');
              onBooked?.();
            }
          });
        }}
        className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text)]">Book a shipment</h3>
          <button type="button" onClick={closeAndReset} className="text-[13px] font-semibold text-[var(--subtext)]">
            Close
          </button>
        </div>

        {success ? (
          <div className="rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 text-[13px] text-[var(--success-text)]">
            {success} Your shipment is pending review by our team.
          </div>
        ) : (
          <>
            <div className={sectionLabel}>Shipment</div>
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

            <div className={sectionLabel}>Sender</div>
            <p className="mb-2 text-[11px] text-[var(--subtext)]">Leave blank to use your account details.</p>
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

            <div className={sectionLabel}>Receiver</div>
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
                <div key={i} className="grid grid-cols-6 gap-1.5 rounded-md border border-[var(--border)] p-2">
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
                        className="px-1 text-[var(--subtext)] hover:text-[#e5231b]"
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
              className="mb-5 text-xs font-semibold text-[#e5231b] hover:underline"
            >
              + Add item
            </button>

            {error && <p className="mb-3 text-sm text-[var(--error-text)]">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAndReset}
                className="rounded-sm border border-[var(--input-border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--subtext)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {isPending ? 'Booking...' : 'Book shipment'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
