'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getSheetCells() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('sheet_cells').select('row_index, col_index, value');
  if (error) return { error: error.message, cells: [] };
  return { error: null, cells: data ?? [] };
}

export async function updateSheetCell(rowIndex: number, colIndex: number, value: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('sheet_cells')
    .upsert({ row_index: rowIndex, col_index: colIndex, value, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}
