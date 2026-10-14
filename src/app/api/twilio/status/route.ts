import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function statusLabel(raw: string) {
  switch (raw.toLowerCase()) {
    case 'answered':
    case 'in-progress':
    case 'completed':
      return 'Answered';
    case 'busy':
    case 'rejected':
      return 'Declined / Busy';
    case 'no-answer':
      return 'Unanswered';
    case 'failed':
    case 'canceled':
    case 'cancelled':
      return 'Failed';
    case 'ringing':
      return 'Ringing';
    case 'initiated':
      return 'Initiated via Twilio';
    default:
      return 'Call attempt logged';
  }
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Twilio status callback: Supabase server configuration is missing.');
    return NextResponse.json({ error: 'Call status storage is not configured.' }, { status: 503 });
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = String(value); });

  // Validate the callback when the auth token is configured.
  if (authToken) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const callbackUrl = request.url;
    if (!signature || !twilio.validateRequest(authToken, signature, callbackUrl, params)) {
      return NextResponse.json({ error: 'Invalid Twilio signature.' }, { status: 403 });
    }
  }

  const rawStatus = String(params.DialCallStatus ?? params.CallStatus ?? 'unknown');
  const callSid = String(params.DialCallSid ?? params.CallSid ?? '').trim();
  const destination = String(params.To ?? params.Called ?? '').trim();
  const label = statusLabel(rawStatus);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Voice <Dial action> callbacks include the destination and DialCallStatus.
    // Update the newest matching call attempt so the existing history row changes in place.
    let query = supabase
      .from('support_calls')
      .select('id, number, status, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (destination) query = query.eq('number', destination);

    const { data: rows, error: readError } = await query;
    if (readError) {
      console.error('Could not find support call for Twilio callback:', readError.message);
      return NextResponse.json({ error: 'Could not find call history.' }, { status: 500 });
    }

    const target = (rows ?? []).find((row) =>
      ['Initiated via Twilio', 'Call attempt logged', 'Ringing'].includes(String(row.status))
    );

    if (!target) {
      // Still acknowledge valid Twilio callbacks; avoid creating duplicate call rows.
      console.warn('Twilio callback received but no matching pending support_calls row was found.', {
        status: rawStatus,
        callSid: callSid ? `${callSid.slice(0, 8)}…` : '',
        destination,
      });
      return new NextResponse('', { status: 204 });
    }

    const patch: Record<string, string> = { status: label };
    // Optional migration adds this column. If it's not present yet, retry without it.
    if (callSid) patch.twilio_call_sid = callSid;

    let { error: updateError } = await supabase.from('support_calls').update(patch).eq('id', target.id);
    if (updateError && callSid && /twilio_call_sid|column/i.test(updateError.message)) {
      const fallback = await supabase.from('support_calls').update({ status: label }).eq('id', target.id);
      updateError = fallback.error;
    }

    if (updateError) {
      console.error('Could not update support call status:', updateError.message);
      return NextResponse.json({ error: 'Could not update call status.' }, { status: 500 });
    }

    return new NextResponse('', { status: 204 });
  } catch (error) {
    console.error('Twilio status callback failed:', error);
    return NextResponse.json({ error: 'Call status callback failed.' }, { status: 500 });
  }
}
