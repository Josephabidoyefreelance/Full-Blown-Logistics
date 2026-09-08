'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function clockIn(userId: string, userName: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('clock_entries').insert({
    user_id: userId,
    user_name: userName,
    clock_in: new Date().toISOString(),
  });

  if (error) {
    console.error('clockIn failed:', error);
    throw new Error(error.message);
  }

  revalidatePath('/clock-tracker');
}

export async function clockOut(entryId: string, notes: string) {
  const supabase = await createClient();

  const { data: entry, error: fetchError } = await supabase
    .from('clock_entries')
    .select('clock_in')
    .eq('id', entryId)
    .single();

  if (fetchError || !entry) {
    console.error('clockOut fetch failed:', fetchError);
    throw new Error(fetchError?.message ?? 'Clock entry not found.');
  }

  const clockInTime = new Date(entry.clock_in).getTime();
  const clockOutTime = Date.now();
  const durationMinutes = Math.max(0, Math.round((clockOutTime - clockInTime) / 60000));

  const { error: updateError } = await supabase
    .from('clock_entries')
    .update({
      clock_out: new Date(clockOutTime).toISOString(),
      duration_minutes: durationMinutes,
      notes: notes.trim() || null,
    })
    .eq('id', entryId);

  if (updateError) {
    console.error('clockOut update failed:', updateError);
    throw new Error(updateError.message);
  }

  revalidatePath('/clock-tracker');
}
