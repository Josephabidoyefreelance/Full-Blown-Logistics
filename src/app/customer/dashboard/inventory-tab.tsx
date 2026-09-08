'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import BookShipmentForm from './book-shipment-form';

type InventoryItem = {
  id: string;
  sku: string | null;
  item_name: string;
  quantity: number;
  location: string | null;
  reorder_threshold: number;
  details: string | null;
  unit_cost: number | null;
};

const emptyForm = {
  sku: '',
  item_name: '',
  quantity: '',
  location: '',
  reorder_threshold: '10',
  details: '',
  unit_cost: '',
};

export default function InventoryTab({
  muted,
  onLowStock,
  onCreateInvoice,
}: {
  muted?: boolean;
  onLowStock?: () => void;
  onCreateInvoice?: (item: { description: string; quantity: string }) => void;
}) {
  const supabase = createClient();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [shipItem, setShipItem] = useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [announcedIds, setAnnouncedIds] = useState<Set<string>>(new Set());

  function speak(text: string) {
    if (muted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  function checkLowStockAlerts(list: InventoryItem[]) {
    const newlyLow = list.filter(
      (it) => it.quantity <= it.reorder_threshold && !announcedIds.has(it.id)
    );
    if (newlyLow.length === 0) return;

    setAnnouncedIds((prev) => {
      const next = new Set(prev);
      newlyLow.forEach((it) => next.add(it.id));
      return next;
    });

    onLowStock?.();
    speak(
      newlyLow.length === 1
        ? `${newlyLow[0].item_name} is low on stock.`
        : `${newlyLow.length} items are low on stock.`
    );
  }

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_inventory')
      .select('id, sku, item_name, quantity, location, reorder_threshold, details, unit_cost')
      .order('item_name', { ascending: true });

    if (error) setError(error.message);
    setItems(data ?? []);
    setLoading(false);
    checkLowStockAlerts(data ?? []);
  }

  function statusFor(item: InventoryItem): { label: string; color: string } {
    if (item.quantity <= item.reorder_threshold) return { label: 'Low stock', color: '#dc2626' };
    return { label: 'In stock', color: '#16a34a' };
  }

  const lowStockItems = items.filter((it) => it.quantity <= it.reorder_threshold);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      sku: item.sku ?? '',
      item_name: item.item_name,
      quantity: String(item.quantity),
      location: item.location ?? '',
      reorder_threshold: String(item.reorder_threshold),
      details: item.details ?? '',
      unit_cost: item.unit_cost ? String(item.unit_cost) : '',
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      sku: form.sku || null,
      item_name: form.item_name,
      quantity: Number(form.quantity) || 0,
      location: form.location || null,
      reorder_threshold: Number(form.reorder_threshold) || 0,
      details: form.details || null,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : 0,
    };

    const { error } = editingId
      ? await supabase.from('customer_inventory').update(payload).eq('id', editingId)
      : await supabase.from('customer_inventory').insert(payload);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setShowForm(false);
    fetchItems();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('customer_inventory').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    fetchItems();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text)]">Inventory</h3>
          <p className="text-[13px] text-[var(--subtext)]">
            Your stock levels. At or below reorder threshold is flagged.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#c91d16]"
        >
          + Add item
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-[13px] text-[var(--error-text)]">
          {error}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="mb-4 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-[13px]" style={{ color: '#ff9d8a' }}>
          <span className="font-semibold">Low stock alert:</span>{' '}
          {lowStockItems.map((it) => `${it.item_name} (${it.quantity})`).join(', ')} need reordering.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-8 border-b border-[var(--border)] text-[11px] uppercase text-[var(--subtext)]">
            <div className="truncate px-5 py-4 text-left font-semibold">SKU</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Item</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Quantity</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Value</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Location</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Status</div>
            <div className="truncate px-5 py-4 text-left font-semibold">Details</div>
            <div className="truncate px-5 py-4 text-right font-semibold">Actions</div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--subtext)]">Loading inventory...</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--subtext)]">
              No items yet. Add your first inventory item to get started.
            </div>
          ) : (
            items.map((item) => {
              const status = statusFor(item);
              const value = (item.unit_cost || 0) * item.quantity;
              return (
                <div key={item.id} className="grid grid-cols-8 border-b border-[var(--border)] text-sm last:border-b-0">
                  <div className="truncate px-5 py-4 text-[var(--text)]">{item.sku ?? '—'}</div>
                  <div className="min-w-0 truncate px-5 py-4">
                    <span className="flex items-center gap-2 text-[var(--text)]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                      <span className="truncate">{item.item_name}</span>
                    </span>
                  </div>
                  <div className="truncate px-5 py-4 text-[var(--text)]">{item.quantity}</div>
                  <div className="truncate px-5 py-4 text-[var(--text)]">
                    {item.unit_cost ? `\u20a6${value.toLocaleString()}` : '—'}
                  </div>
                  <div className="truncate px-5 py-4 text-[var(--subtext)]">{item.location ?? '—'}</div>
                  <div className="truncate px-5 py-4">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: status.color + '1a', color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="truncate px-5 py-4">
                    {item.details ? (
                      <button
                        onClick={() => setDetailItem(item)}
                        className="text-[12px] font-semibold text-[#e5231b] hover:underline"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-[12px] text-[var(--subtext)]">—</span>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
                          setOpenMenuId(openMenuId === item.id ? null : item.id);
                        }}
                        className="rounded-sm border border-[var(--input-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)]"
                      >
                        Actions &#9662;
                      </button>
                    </div>
                    {openMenuId === item.id && menuPos && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                        <div
                          className="fixed z-50 w-40 rounded-md border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
                          style={{ top: menuPos.top, left: menuPos.left }}
                        >
                          <button
                            onClick={() => { setShipItem(item); setOpenMenuId(null); }}
                            className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)]"
                          >
                            Ship
                          </button>
                          <button
                            onClick={() => { openEdit(item); setOpenMenuId(null); }}
                            className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              onCreateInvoice?.({ description: item.item_name, quantity: String(item.quantity) });
                              setOpenMenuId(null);
                            }}
                            className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)]"
                          >
                            Create invoice
                          </button>
                          <button
                            onClick={() => { handleDelete(item.id); setOpenMenuId(null); }}
                            className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-[420px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">{editingId ? 'Edit item' : 'Add item'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-[13px] font-semibold text-[var(--subtext)]">
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Item name</label>
                <input
                  required
                  value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                  className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Quantity</label>
                  <input
                    type="number"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Reorder at</label>
                  <input
                    type="number"
                    required
                    value={form.reorder_threshold}
                    onChange={(e) => setForm((f) => ({ ...f, reorder_threshold: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Unit cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.unit_cost}
                    onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add item'}
            </button>
          </form>
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailItem(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">{detailItem.item_name}</h3>
              <button onClick={() => setDetailItem(null)} className="text-[13px] font-semibold text-[var(--subtext)]">
                Close
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{detailItem.details}</p>
          </div>
        </div>
      )}

      {shipItem && (
        <BookShipmentForm
          open
          onOpenChange={(o) => !o && setShipItem(null)}
          initialItem={{ description: shipItem.item_name, quantity: String(shipItem.quantity) }}
          onBooked={() => setShipItem(null)}
        />
      )}
    </div>
  );
}
