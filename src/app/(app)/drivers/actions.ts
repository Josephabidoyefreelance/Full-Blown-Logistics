'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateDriverStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('drivers').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/drivers');
  return { error: null };
}

const RATING_COLUMNS = [
  'communication_rating',
  'punctuality_rating',
  'neatness_rating',
  'composure_rating',
] as const;
export type RatingColumn = (typeof RATING_COLUMNS)[number];

export async function updateDriverCategoryRating(id: string, column: RatingColumn, rating: number) {
  if (!RATING_COLUMNS.includes(column)) return { error: 'Invalid rating category.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('drivers')
    .update({ [column]: rating })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/drivers');
  return { error: null };
}

export async function createDriver(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  const license_no = String(formData.get('license_no') ?? '').trim();
  const license_expiry = String(formData.get('license_expiry') ?? '') || null;
  const status = String(formData.get('status') ?? 'Available');

  if (!name || !license_no) return { error: 'Name and licence number are required.' };

  const { error } = await supabase.from('drivers').insert({
    name,
    license_no,
    license_expiry,
    status,
    trips_completed: 0,
    rating: null,
  });

  if (error) return { error: error.message };
  revalidatePath('/drivers');
  return { error: null };
}
