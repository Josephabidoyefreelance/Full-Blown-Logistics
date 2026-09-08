'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { LOW_STOCK_THRESHOLD } from './constants';

function deriveStatus(qty: number) {
  return qty < LOW_STOCK_THRESHOLD ? 'Low stock' : 'In stock';
}

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient();

  const sku = String(formData.get('sku') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const qtyRaw = String(formData.get('qty') ?? '').trim();
  const qty = qtyRaw ? Number(qtyRaw) : 0;
  const reorderRaw = String(formData.get('reorder_level') ?? '').trim();
  const reorder_level = reorderRaw ? Number(reorderRaw) : 0;
  const location = String(formData.get('location') ?? '').trim() || null;

  if (!sku || !name) return { error: 'SKU and item name are required.' };

  const { error } = await supabase.from('inventory_items').insert({
    sku,
    name,
    qty,
    reorder_level,
    location,
    status: deriveStatus(qty),
  });

  if (error) return { error: error.message };
  revalidatePath('/warehouse');
  return { error: null };
}

export async function updateInventoryItem(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get('id') ?? '');
  const sku = String(formData.get('sku') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const qtyRaw = String(formData.get('qty') ?? '').trim();
  const qty = qtyRaw ? Number(qtyRaw) : 0;
  const reorderRaw = String(formData.get('reorder_level') ?? '').trim();
  const reorder_level = reorderRaw ? Number(reorderRaw) : 0;
  const location = String(formData.get('location') ?? '').trim() || null;

  if (!id) return { error: 'Missing item id.' };
  if (!sku || !name) return { error: 'SKU and item name are required.' };

  const { error } = await supabase
    .from('inventory_items')
    .update({
      sku,
      name,
      qty,
      reorder_level,
      location,
      status: deriveStatus(qty),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/warehouse');
  return { error: null };
}

export async function deleteInventoryItem(id: string) {
  if (!id) return { error: 'Missing item id.' };
  const supabase = await createClient();
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/warehouse');
  return { error: null };
}
