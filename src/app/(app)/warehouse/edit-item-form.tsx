'use client';

import { LOW_STOCK_THRESHOLD, STORAGE_TYPES } from './constants';
import { useRef, useState, useTransition } from 'react';
import { updateInventoryItem } from './actions';

type Item = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  qty: number;
  reorder_level: number;
  location: string | null;
  storage_type?: string | null;
  zone?: string | null;
  rack?: string | null;
  bin?: string | null;
  unit?: string | null;
  batch_no?: string | null;
  expiry_date?: string | null;
  supplier?: string | null;
  temperature_c?: number | null;
  notes?: string | null;
};

const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export default function EditItemForm({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button onClick={() => { setError(null); setOpen(true); }} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Edit</button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Edit inventory item</h2><p className="text-xs text-neutral-400">{item.sku}</p></div>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <form ref={formRef} action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await updateInventoryItem(fd);
                if (res?.error) { setError(res.error); return; }
                setOpen(false);
              });
            }} className="space-y-4">
              <input type="hidden" name="id" value={item.id} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">SKU</label><input name="sku" required defaultValue={item.sku} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Item name *</label><input name="name" required defaultValue={item.name} className={inputClass} /></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">Description / full item details</label><textarea name="description" rows={3} defaultValue={item.description ?? ''} className={inputClass} /></div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Quantity (units)</label><input type="number" min="0" name="qty" defaultValue={item.qty} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Reorder level (units)</label><input type="number" min="0" name="reorder_level" defaultValue={item.reorder_level} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Unit</label><input name="unit" defaultValue={item.unit ?? 'units'} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Storage type</label><select name="storage_type" defaultValue={item.storage_type ?? 'Ambient'} className={inputClass}>{STORAGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Location / warehouse</label><input name="location" defaultValue={item.location ?? ''} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Zone</label><input name="zone" defaultValue={item.zone ?? ''} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Rack</label><input name="rack" defaultValue={item.rack ?? ''} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Bin</label><input name="bin" defaultValue={item.bin ?? ''} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Batch / lot number</label><input name="batch_no" defaultValue={item.batch_no ?? ''} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Expiry date</label><input type="date" name="expiry_date" defaultValue={item.expiry_date ?? ''} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Supplier</label><input name="supplier" defaultValue={item.supplier ?? ''} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Temperature °C</label><input type="number" step="0.1" name="temperature_c" defaultValue={item.temperature_c ?? ''} className={inputClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-neutral-500">Notes</label><input name="notes" defaultValue={item.notes ?? ''} className={inputClass} /></div>
              </div>
              <p className="text-xs text-neutral-400">Status updates automatically. Below {LOW_STOCK_THRESHOLD} is Low stock.</p>
              <button type="submit" disabled={isPending} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{isPending ? 'Saving...' : 'Save changes'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
