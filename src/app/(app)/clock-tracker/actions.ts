'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function currentUserAndEntry(entryId?: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Please sign in first.');
  let query = supabase.from('clock_entries').select('id, user_id, clock_out, paused_at, paused_seconds, pause_reason').eq('user_id', user.id).is('clock_out', null);
  if (entryId) query = query.eq('id', entryId);
  const { data: entry, error: entryError } = await query.order('clock_in', { ascending: false }).limit(1).maybeSingle();
  if (entryError || !entry) throw new Error(entryError?.message || 'Active time session not found.');
  return { supabase, user, entry };
}

export async function clockIn() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Please sign in before clocking in.');
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const { data: existing, error: existingError } = await supabase.from('clock_entries').select('id').eq('user_id', user.id).is('clock_out', null).limit(1).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) throw new Error('You are already clocked in.');
  const { error } = await supabase.from('clock_entries').insert({
    user_id: user.id, user_name: profile?.full_name || user.email || 'Staff member', clock_in: new Date().toISOString(),
    paused_at: null, paused_seconds: 0, idle_seconds: 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/clock-tracker');
}

export async function setClockPaused(entryId: string, paused: boolean, idlePause = false) {
  if (!entryId) throw new Error('No active session found.');
  const { supabase, user, entry } = await currentUserAndEntry(entryId);
  const now = new Date();
  const update: Record<string, string | number | null> = {};
  if (paused && !entry.paused_at) {
    update.paused_at = now.toISOString();
    update.pause_reason = idlePause ? 'idle' : 'manual';
  } else if (!paused && entry.paused_at) {
    const pausedSeconds = Math.floor(Math.max(0, now.getTime() - new Date(entry.paused_at).getTime()) / 1000);
    update.paused_at = null;
    update.pause_reason = null;
    update.paused_seconds = Math.max(0, Number(entry.paused_seconds || 0)) + pausedSeconds;
    // JAAD policy: every paused interval is non-working time and must be
    // accounted for in Idle Time, whether it came from manual Pause or an
    // automatic away/inactivity pause. Never silently discard paused minutes.
    const { data: fresh, error: readError } = await supabase.from('clock_entries').select('idle_seconds').eq('id', entry.id).eq('user_id', user.id).maybeSingle();
    if (readError) throw new Error(readError.message);
    update.idle_seconds = Math.max(0, Number(fresh?.idle_seconds || 0)) + pausedSeconds;
  }
  if (Object.keys(update).length) {
    const { error } = await supabase.from('clock_entries').update(update).eq('id', entry.id).eq('user_id', user.id).is('clock_out', null);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/clock-tracker');
}

export async function clockOut(entryId: string, notes: string) {
  const { supabase, user, entry } = await currentUserAndEntry(entryId);
  const now = new Date();
  const update: Record<string, string | number | null> = { clock_out: now.toISOString(), notes: notes.trim() || null };
  if (entry.paused_at) {
    const pausedMs = Math.max(0, now.getTime() - new Date(entry.paused_at).getTime());
    update.paused_at = null;
    update.pause_reason = null;
    update.paused_seconds = Math.max(0, Number(entry.paused_seconds || 0)) + Math.floor(pausedMs / 1000);
    const { data: fresh, error: readError } = await supabase.from('clock_entries').select('idle_seconds').eq('id', entry.id).eq('user_id', user.id).maybeSingle();
    if (readError) throw new Error(readError.message);
    // Clocking out while paused closes the pause as idle time as well.
    update.idle_seconds = Math.max(0, Number(fresh?.idle_seconds || 0)) + Math.floor(pausedMs / 1000);
  }
  const { data: updated, error } = await supabase.from('clock_entries').update(update).eq('id', entry.id).eq('user_id', user.id).is('clock_out', null).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error('Session was not closed. Refresh and try again.');
  revalidatePath('/clock-tracker');
}
