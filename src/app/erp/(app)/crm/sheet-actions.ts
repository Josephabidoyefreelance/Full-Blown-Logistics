'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getSheetTabs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('crm_sheet_tabs')
    .select('id, name, position, created_at, column_widths, row_heights')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { error: error.message, tabs: [] };

  if (!data?.length) {
    const { data: created, error: createError } = await supabase
      .from('crm_sheet_tabs')
      .insert({ name: 'Sheet 1', position: 0 })
      .select('id, name, position, created_at, column_widths, row_heights')
      .single();
    if (createError) return { error: createError.message, tabs: [] };
    return { error: null, tabs: created ? [created] : [] };
  }

  return { error: null, tabs: data };
}

export async function createSheetTab(name?: string) {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from('crm_sheet_tabs')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = Number(last?.position ?? -1) + 1;
  const tabName = String(name || `Sheet ${position + 1}`).trim() || `Sheet ${position + 1}`;

  const { data, error } = await supabase
    .from('crm_sheet_tabs')
    .insert({ name: tabName, position })
    .select('id, name, position, created_at, column_widths, row_heights')
    .single();

  if (error) return { error: error.message, tab: null };
  revalidatePath('/crm');
  return { error: null, tab: data };
}

export async function renameSheetTab(id: string, name: string) {
  const cleanName = String(name || '').trim();
  if (!id || !cleanName) return { error: 'Sheet name is required.' };

  const supabase = await createClient();
  const { error } = await supabase.from('crm_sheet_tabs').update({ name: cleanName }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/crm');
  return { error: null };
}

export async function deleteSheetTab(id: string) {
  if (!id) return { error: 'Sheet id is required.' };
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from('crm_sheet_tabs')
    .select('id', { count: 'exact', head: true });
  if (countError) return { error: countError.message };
  if ((count ?? 0) <= 1) return { error: 'At least one sheet must remain.' };
  const { error } = await supabase.from('crm_sheet_tabs').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function updateSheetLayout(
  tabId: string,
  columnWidths: Record<string, number>,
  rowHeights: Record<string, number>,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('crm_sheet_tabs')
    .update({ column_widths: columnWidths, row_heights: rowHeights })
    .eq('id', tabId);
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function getSheetCells(tabId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('crm_sheet_cells')
    .select('row_index, col_index, value, style')
    .eq('sheet_id', tabId);

  if (error) return { error: error.message, cells: [] };
  return { error: null, cells: data ?? [] };
}

export async function updateSheetCell(
  tabId: string,
  rowIndex: number,
  colIndex: number,
  value: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from('crm_sheet_cells').upsert(
    {
      sheet_id: tabId,
      row_index: rowIndex,
      col_index: colIndex,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sheet_id,row_index,col_index' },
  );

  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function updateSheetCellStyle(
  tabId: string,
  rowIndex: number,
  colIndex: number,
  style: Record<string, string | number | boolean>,
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('crm_sheet_cells')
    .select('id')
    .eq('sheet_id', tabId)
    .eq('row_index', rowIndex)
    .eq('col_index', colIndex)
    .maybeSingle();

  const payload = { style, updated_at: new Date().toISOString() };
  const { error } = existing?.id
    ? await supabase.from('crm_sheet_cells').update(payload).eq('id', existing.id)
    : await supabase.from('crm_sheet_cells').insert({ sheet_id: tabId, row_index: rowIndex, col_index: colIndex, value: '', ...payload });

  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}
