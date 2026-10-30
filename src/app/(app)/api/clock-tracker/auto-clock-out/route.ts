import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUTO_CLOCK_OUT_NOTE = 'Automatically clocked out because the JAAD ERP tab was left or hidden.';

export async function POST(request: Request) {
  let requestedEntryId = '';
  try {
    const body = await request.json();
    requestedEntryId = typeof body?.entryId === 'string' ? body.entryId : '';
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!requestedEntryId) return Response.json({ error: 'Missing session ID.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: activeEntry, error: findError } = await supabase
    .from('clock_entries')
    .select('id')
    .eq('id', requestedEntryId)
    .eq('user_id', user.id)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error('Automatic clock-out lookup failed:', findError);
    return Response.json({ error: 'Could not find the active session.' }, { status: 500 });
  }

  if (!activeEntry) return Response.json({ ok: true, alreadyClosed: true });

  const { data: updated, error: updateError } = await supabase
    .from('clock_entries')
    .update({ clock_out: new Date().toISOString(), notes: AUTO_CLOCK_OUT_NOTE })
    .eq('id', activeEntry.id)
    .eq('user_id', user.id)
    .is('clock_out', null)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('Automatic clock-out update failed:', updateError);
    return Response.json({ error: 'Could not close the active session.' }, { status: 500 });
  }

  return Response.json({ ok: true, closed: Boolean(updated) });
}
