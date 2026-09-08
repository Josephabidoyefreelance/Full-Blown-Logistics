import { createClient } from '@/lib/supabase/server';
import NewItemForm from './new-item-form';
import EditItemForm from './edit-item-form';
import DeleteItemButton from './delete-item-button';
import { LOW_STOCK_THRESHOLD } from './constants';

const COLS = 'grid-cols-[140px_220px_110px_180px_140px_200px]';

export default async function WarehousePage() {
  const supabase = await createClient();
  const { data: inventory, error } = await supabase
    .from('inventory_items')
    .select('id, sku, name, qty, reorder_level, location')
    .order('sku');

  const lowStockItems = (inventory ?? []).filter((i) => i.qty < LOW_STOCK_THRESHOLD);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Warehouse</h1>
          <p className="text-sm text-neutral-500">
            Inventory and stock levels. Below {LOW_STOCK_THRESHOLD} in stock is flagged for reorder.
          </p>
        </div>
        <NewItemForm />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">Could not load inventory: {error.message}</p>}

      {lowStockItems.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <span className="font-semibold">Low stock alert:</span>{' '}
          {lowStockItems.map((i) => `${i.name} (${i.qty})`).join(', ')} {lowStockItems.length > 1 ? 'need' : 'needs'}{' '}
          reordering.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="min-w-[1100px]">
          <div
            className={`grid ${COLS} items-center justify-between bg-neutral-50 px-4 py-2.5 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}
          >
            <div>SKU</div>
            <div>Item</div>
            <div>Quantity</div>
            <div>Location</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {(inventory ?? []).map((i) => {
            const needsReorder = i.qty < LOW_STOCK_THRESHOLD;
            return (
              <div
                key={i.id}
                className={`grid ${COLS} items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-sm dark:border-neutral-800`}
              >
                <div className="truncate font-mono text-neutral-900 dark:text-neutral-100">{i.sku}</div>
                <div className="flex items-center gap-2 truncate text-neutral-700 dark:text-neutral-300">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      needsReorder ? 'animate-pulse bg-red-500' : 'bg-green-500'
                    }`}
                    title={needsReorder ? 'Below reorder level' : 'Stock level OK'}
                  />
                  <span className="truncate">{i.name}</span>
                </div>
                <div className="text-neutral-700 dark:text-neutral-300">{i.qty}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{i.location ?? '\u2014'}</div>
                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      needsReorder ? 'bg-red-500/15 text-red-500' : 'bg-green-500/15 text-green-500'
                    }`}
                  >
                    {needsReorder ? 'Low stock' : 'In stock'}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <EditItemForm
                    item={{
                      id: i.id,
                      sku: i.sku,
                      name: i.name,
                      qty: i.qty,
                      reorder_level: i.reorder_level,
                      location: i.location,
                    }}
                  />
                  <DeleteItemButton id={i.id} name={i.name} />
                </div>
              </div>
            );
          })}

          {!inventory?.length && !error && (
            <div className="px-4 py-8 text-center text-neutral-400">No inventory yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
