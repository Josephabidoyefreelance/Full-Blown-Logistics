'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { LOW_STOCK_THRESHOLD } from './constants';

function deriveStatus(qty: number) {
  return qty < LOW_STOCK_THRESHOLD ? 'Low stock' : 'In stock';
}

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim();
  return value || null;
}

function numberOrNull(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim();
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function generateSku() {
  return `SKU-${Date.now().toString().slice(-8)}`;
}

function buildPayload(formData: FormData) {
  const qty = numberOrNull(formData, 'qty') ?? 0;
  const reorder_level = numberOrNull(formData, 'reorder_level') ?? 0;

  return {
    sku: text(formData, 'sku') || generateSku(),
    name: String(formData.get('name') ?? '').trim(),
    description: text(formData, 'description'),
    qty,
    reorder_level,
    location: text(formData, 'location'),
    storage_type: text(formData, 'storage_type') || 'Ambient',
    zone: text(formData, 'zone'),
    rack: text(formData, 'rack'),
    bin: text(formData, 'bin'),
    unit: text(formData, 'unit') || 'units',
    batch_no: text(formData, 'batch_no'),
    expiry_date: text(formData, 'expiry_date'),
    supplier: text(formData, 'supplier'),
    temperature_c: numberOrNull(formData, 'temperature_c'),
    notes: text(formData, 'notes'),
    status: deriveStatus(qty),
  };
}

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const payload = buildPayload(formData);

  if (!payload.name) return { error: 'Item name is required.' };

  const { error } = await supabase.from('inventory_items').insert(payload);
  if (error) return { error: error.message };

  revalidatePath('/warehouse');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function updateInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  const payload = buildPayload(formData);

  if (!id) return { error: 'Missing item id.' };
  if (!payload.sku || !payload.name) return { error: 'SKU and item name are required.' };

  const { error } = await supabase.from('inventory_items').update(payload).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/warehouse');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function deleteInventoryItem(id: string) {
  if (!id) return { error: 'Missing item id.' };
  const supabase = await createClient();
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/warehouse');
  revalidatePath('/dashboard');
  return { error: null };
}
