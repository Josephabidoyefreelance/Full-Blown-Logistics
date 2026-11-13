'use client';

import { LOW_STOCK_THRESHOLD, STORAGE_TYPES } from './constants';
import { useRef, useState, useTransition } from 'react';
import { createInventoryItem } from './actions';

const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export default function NewItemForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [generatedSku, setGeneratedSku] = useState('');

  function openForm() {
    setGeneratedSku(`SKU-${Date.now().toString().slice(-8)}`);
    setError(null);
    setOpen(true);
  }

  return (
    <>
      <button onClick={openForm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
        + Add item
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Add inventory item</h2>
                <p className="mt-0.5 text-xs text-neutral-400">SKU is generated automatically. Add the full stock record so it can be printed later.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">✕</button>
            </div>

            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <form ref={formRef} action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await createInventoryItem(fd);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                formRef.current?.reset();
                setOpen(false);
              });
            }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">SKU (automatic)</label>
                  <input name="sku" value={generatedSku} readOnly className={`${inputClass} bg-neutral-50 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Item name *</label>
                  <input name="name" required placeholder="Heavy duty cartons" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Description / full item details</label>
                <textarea name="description" rows={3} placeholder="Describe the product, specification, packaging, intended use, etc." className={inputClass} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Quantity (units)</label>
                  <input type="number" min="0" name="qty" placeholder="340" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Reorder level (units)</label>
                  <input type="number" min="0" name="reorder_level" placeholder="50" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Unit</label>
                  <input name="unit" defaultValue="units" placeholder="units, cartons, rolls" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Storage type</label>
                  <select name="storage_type" defaultValue="Ambient" className={inputClass}>
                    {STORAGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Location / warehouse</label>
                  <input name="location" placeholder="Lagos hub" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Zone</label><input name="zone" placeholder="Zone A" className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Rack</label><input name="rack" placeholder="Rack 04" className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Bin</label><input name="bin" placeholder="Bin 12" className={inputClass} /></div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Batch / lot number</label><input name="batch_no" className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Expiry date</label><input type="date" name="expiry_date" className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Supplier</label><input name="supplier" placeholder="Supplier name" className={inputClass} /></div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Temperature °C</label><input type="number" step="0.1" name="temperature_c" placeholder="e.g. 4" className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Notes</label><input name="notes" placeholder="Handling or operational notes" className={inputClass} /></div>
              </div>

              <p className="text-xs text-neutral-400">Status is automatic: below {LOW_STOCK_THRESHOLD} in stock is Low stock; otherwise In stock.</p>

              <button type="submit" disabled={isPending} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Adding item...' : 'Add inventory item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
