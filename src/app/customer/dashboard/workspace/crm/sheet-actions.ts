'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireCustomerModule } from '@/lib/customer-tenant';


// Resolve the authenticated tenant on every server action; never trust a client company ID.
async function sheetTenant() {
  const access = await requireCustomerModule('crm');
  if (!access.ok || !access.context.fullCrmAccess) return null;
  return access.context.companyId;
}

async function ownsSheet(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, tabId: string) {
  if (!tabId) return false;
  const { data, error } = await supabase.from('crm_sheet_tabs')
    .select('id').eq('id', tabId).eq('company_id', companyId).maybeSingle();
  return !error && !!data;
}

export async function getSheetTabs() {
  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable", tabs: [] };
  const { data, error } = await supabase
    .from('crm_sheet_tabs')
    .select('id, name, position, created_at, column_widths, row_heights')
    .eq('company_id', companyId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { error: error.message, tabs: [] };

  if (!data?.length) {
    const { data: created, error: createError } = await supabase
      .from('crm_sheet_tabs')
      .insert({ company_id: companyId, name: 'Sheet 1', position: 0 })
      .select('id, name, position, created_at, column_widths, row_heights')
      .single();
    if (createError) return { error: createError.message, tabs: [] };
    return { error: null, tabs: created ? [created] : [] };
  }

  return { error: null, tabs: data };
}

export async function createSheetTab(name?: string) {
  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable", tab: null };
  const { data: last } = await supabase
    .from('crm_sheet_tabs')
    .select('position')
    .eq('company_id', companyId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = Number(last?.position ?? -1) + 1;
  const tabName = String(name || `Sheet ${position + 1}`).trim() || `Sheet ${position + 1}`;

  const { data, error } = await supabase
    .from('crm_sheet_tabs')
    .insert({ company_id: companyId, name: tabName, position })
    .select('id, name, position, created_at, column_widths, row_heights')
    .single();

  if (error) return { error: error.message, tab: null };
  revalidatePath('/customer/dashboard/workspace/crm');
  return { error: null, tab: data };
}

export async function renameSheetTab(id: string, name: string) {
  const cleanName = String(name || '').trim();
  if (!id || !cleanName) return { error: 'Sheet name is required.' };

  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable" };
  const { error } = await supabase.from('crm_sheet_tabs').update({ name: cleanName }).eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };

  revalidatePath('/customer/dashboard/workspace/crm');
  return { error: null };
}

export async function deleteSheetTab(id: string) {
  if (!id) return { error: 'Sheet id is required.' };
  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable" };
  const { count, error: countError } = await supabase
    .from('crm_sheet_tabs')
    .select('id', { count: 'exact', head: true }).eq('company_id', companyId);
  if (countError) return { error: countError.message };
  if ((count ?? 0) <= 1) return { error: 'At least one sheet must remain.' };
  const { error } = await supabase.from('crm_sheet_tabs').delete().eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/crm');
  return { error: null };
}

export async function updateSheetLayout(
  tabId: string,
  columnWidths: Record<string, number>,
  rowHeights: Record<string, number>,
) {
  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable" };
  if (!(await ownsSheet(supabase, companyId, tabId))) return { error: "Sheet not found in your company" };
  const { error } = await supabase
    .from('crm_sheet_tabs')
    .update({ column_widths: columnWidths, row_heights: rowHeights })
    .eq('id', tabId).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/crm');
  return { error: null };
}

export async function getSheetCells(tabId: string) {
  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable", cells: [] };
  if (!(await ownsSheet(supabase, companyId, tabId))) return { error: "Sheet not found in your company" , cells: [] };
  const { data, error } = await supabase
    .from('crm_sheet_cells')
    .select('row_index, col_index, value, style')
    .eq('sheet_id', tabId).eq('company_id', companyId);

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
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable" };
  if (!(await ownsSheet(supabase, companyId, tabId))) return { error: "Sheet not found in your company" };
  const { error } = await supabase.from('crm_sheet_cells').upsert(
    {
      company_id: companyId,
      sheet_id: tabId,
      row_index: rowIndex,
      col_index: colIndex,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sheet_id,row_index,col_index' },
  );

  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/crm');
  return { error: null };
}

export async function updateSheetCellStyle(
  tabId: string,
  rowIndex: number,
  colIndex: number,
  style: Record<string, string | number | boolean>,
) {
  const supabase = await createClient();
  const companyId = await sheetTenant();
  if (!companyId) return { error: "Company workspace unavailable" };
  if (!(await ownsSheet(supabase, companyId, tabId))) return { error: "Sheet not found in your company" };
  const { data: existing } = await supabase
    .from('crm_sheet_cells')
    .select('id')
    .eq('sheet_id', tabId)
    .eq('company_id', companyId)
    .eq('row_index', rowIndex)
    .eq('col_index', colIndex)
    .maybeSingle();

  const payload = { style, updated_at: new Date().toISOString() };
  const { error } = existing?.id
    ? await supabase.from('crm_sheet_cells').update(payload).eq('id', existing.id).eq('company_id', companyId)
    : await supabase.from('crm_sheet_cells').insert({ company_id: companyId, sheet_id: tabId, row_index: rowIndex, col_index: colIndex, value: '', ...payload });

  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/crm');
  return { error: null };
}
