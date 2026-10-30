import { createClient } from '@/lib/supabase/server';
import NewItemForm from './new-item-form';
import EditItemForm from './edit-item-form';
import DeleteItemButton from './delete-item-button';
import InventoryPreview from './inventory-preview';
import PrintInventoryButton from './print-inventory-button';
import WarehouseLiveRefresh from './live-refresh';
import { LOW_STOCK_THRESHOLD, STORAGE_TYPES } from './constants';

function num(value: number) {
  return new Intl.NumberFormat('en-NG').format(value);
}

export default async function WarehousePage() {
  const supabase = await createClient();
  const { data: inventory, error } = await supabase
    .from('inventory_items')
    .select('id, sku, name, description, qty, reorder_level, location, storage_type, zone, rack, bin, unit, batch_no, expiry_date, supplier, temperature_c, notes')
    .order('sku');

  const items = inventory ?? [];
  const lowStockItems = items.filter((i) => Number(i.qty ?? 0) < LOW_STOCK_THRESHOLD);
  const reorderItems = items.filter((i) => Number(i.reorder_level ?? 0) > 0 && Number(i.qty ?? 0) <= Number(i.reorder_level ?? 0));
  const totalUnits = items.reduce((sum, i) => sum + Number(i.qty ?? 0), 0);
  const locations = new Set(items.map((i) => i.location).filter(Boolean)).size;

  const storageCounts = STORAGE_TYPES.map((type) => ({
    ...type,
    count: items.filter((item) => (item.storage_type ?? 'Ambient') === type.value).length,
  }));

  const printableItems = items.map((i) => ({
    id: i.id,
    sku: i.sku,
    name: i.name,
    description: i.description,
    qty: Number(i.qty ?? 0),
    reorder_level: Number(i.reorder_level ?? 0),
    location: i.location,
    storage_type: i.storage_type,
    zone: i.zone,
    rack: i.rack,
    bin: i.bin,
    unit: i.unit,
    batch_no: i.batch_no,
    expiry_date: i.expiry_date,
    supplier: i.supplier,
    temperature_c: i.temperature_c,
    notes: i.notes,
  }));

  return (
    <div className="space-y-5">
      <WarehouseLiveRefresh />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Warehouse</h1>
          <p className="text-sm text-neutral-500">Inventory and stock levels. Below {LOW_STOCK_THRESHOLD} in stock is flagged for reorder.</p>
        </div>
        <NewItemForm />
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">Could not load inventory: {error.message}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Inventory items</p><p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{num(items.length)}</p><p className="mt-1 text-xs text-neutral-400">Active SKUs</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Units in stock</p><p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{num(totalUnits)}</p><p className="mt-1 text-xs text-neutral-400">Across all locations</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-900/50 dark:bg-red-950/20"><p className="text-[11px] font-medium uppercase tracking-wide text-red-500">Low stock</p><p className="mt-1 text-2xl font-semibold text-red-600">{num(lowStockItems.length)}</p><p className="mt-1 text-xs text-red-400">Requires attention</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20"><p className="text-[11px] font-medium uppercase tracking-wide text-amber-600">Reorder queue</p><p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{num(reorderItems.length)}</p><p className="mt-1 text-xs text-neutral-500">At or below reorder level</p></div>
      </div>

      {lowStockItems.length > 0 && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"><span className="font-semibold">Low stock alert:</span>{' '}{lowStockItems.map((i) => `${i.name} (${i.qty})`).join(', ')} {lowStockItems.length > 1 ? 'need' : 'needs'} reordering.</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {storageCounts.map((storage) => (
          <div key={storage.value} className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{storage.label}</p><p className="mt-0.5 text-[10px] text-neutral-400">{storage.description}</p></div><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{storage.count}</span></div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div><h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Inventory Register</h2><p className="text-xs text-neutral-500">Click any SKU or item name to open the complete inventory record, edit it, or print/save it as PDF.</p></div>
          <div className="flex shrink-0 items-center gap-2 text-[11px]"><PrintInventoryButton items={printableItems} /><span className="rounded-full border border-neutral-300 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">{items.length} records</span><span className="rounded-full border border-red-200 px-2.5 py-1 text-red-500 dark:border-red-900/60">{lowStockItems.length} low stock</span></div>
        </div>

        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
            <colgroup><col className="w-[15%]" /><col className="w-[19%]" /><col className="w-[14%]" /><col className="w-[15%]" /><col className="w-[13%]" /><col className="w-[13%]" /><col className="w-[11%]" /></colgroup>
            <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800/95">
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">SKU</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Item</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500"><span className="block">Quantity</span><span className="block">(units)</span></th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Location</th>
                <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-neutral-500"><span className="block">Reorder level</span><span className="block">(units)</span></th>
                <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const qty = Number(i.qty ?? 0);
                const reorderLevel = Number(i.reorder_level ?? 0);
                const needsReorder = qty < LOW_STOCK_THRESHOLD;
                const item = { ...i, qty, reorder_level: reorderLevel };
                return (
                  <tr key={i.id} className="border-b border-neutral-100 align-middle last:border-b-0 hover:bg-neutral-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                    <td className="px-4 py-4"><InventoryPreview item={item}><span className="block cursor-pointer truncate font-mono text-[13px] font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100">{i.sku}</span></InventoryPreview></td>
                    <td className="px-4 py-4"><InventoryPreview item={item}><span className="flex min-w-0 cursor-pointer items-center gap-2 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"><span className={`inline-block h-2 w-2 shrink-0 rounded-full ${needsReorder ? 'bg-red-500' : 'bg-green-500'}`} /><span className="truncate">{i.name}</span></span></InventoryPreview></td>
                    <td className="px-4 py-4 text-center text-neutral-700 dark:text-neutral-300"><span className="font-medium">{num(qty)}</span></td>
                    <td className="px-4 py-4 text-neutral-700 dark:text-neutral-300"><span className="block truncate">{i.location ?? '—'}</span></td>
                    <td className="px-4 py-4 text-center"><span className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${needsReorder ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${needsReorder ? 'bg-red-500' : 'bg-green-500'}`} />{needsReorder ? 'Low stock' : 'In stock'}</span></td>
                    <td className="px-4 py-4 text-center text-neutral-700 dark:text-neutral-300"><span className="font-medium">{num(reorderLevel)}</span></td>
                    <td className="px-4 py-4"><div className="flex items-center justify-center gap-2"><EditItemForm item={item} /><DeleteItemButton id={i.id} name={i.name} /></div></td>
                  </tr>
                );
              })}
              {!items.length && !error && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">No inventory yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Stock visibility</p><p className="mt-1 text-xs leading-5 text-neutral-500">Click any SKU or item name for the full record, editing and print/PDF options.</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Reorder control</p><p className="mt-1 text-xs leading-5 text-neutral-500">Quantity and Reorder level are clearly labelled and centered so staff know exactly what each number means.</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Storage coverage</p><p className="mt-1 text-xs leading-5 text-neutral-500">{num(locations)} active location{locations === 1 ? '' : 's'} currently represented in the register, across ambient, cold and controlled storage.</p></div>
      </div>
    </div>
  );
}
