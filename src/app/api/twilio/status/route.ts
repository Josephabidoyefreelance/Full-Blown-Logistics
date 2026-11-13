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
  if (!authToken) {
    return NextResponse.json(
      { error: 'Twilio callback verification is not configured.' },
      { status: 503 }
    );
  }
  {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const callbackUrl = request.url;
    if (!signature || !twilio.validateRequest(authToken, signature, callbackUrl, params)) {
      return NextResponse.json({ error: 'Invalid Twilio signature.' }, { status: 403 });
    }
  }

  const rawStatus = String(params.DialCallStatus ?? params.CallStatus ?? 'unknown');
  const callSid = String(params.CallSid ?? params.DialCallSid ?? '').trim();
  const destination = String(params.To ?? params.Called ?? '').trim();
  const label = statusLabel(rawStatus);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Never guess a tenant's call using phone numbers or recent history.
    if (!callSid) {
      return NextResponse.json({ error: 'Missing Twilio Call SID.' }, { status: 400 });
    }

    const { data: target, error: readError } = await supabase
      .from('support_calls')
      .select('id, company_id')
      .eq('twilio_call_sid', callSid)
      .maybeSingle();

    if (readError) {
      console.error('Twilio call lookup failed:', readError.message);
      return NextResponse.json({ error: 'Call lookup failed.' }, { status: 500 });
    }

    if (!target || !target.company_id) {
      console.warn('No tenant-owned support call matches this Twilio Call SID.');
      return new NextResponse('', { status: 204 });
    }

    const { error: updateError } = await supabase
      .from('support_calls')
      .update({ status: label })
      .eq('id', target.id)
      .eq('company_id', target.company_id)
      .eq('twilio_call_sid', callSid);

    if (updateError) {
      console.error('Twilio call status update failed:', updateError.message);
      return NextResponse.json({ error: 'Call status update failed.' }, { status: 500 });
    }
    return new NextResponse('', { status: 204 });
  } catch (error) {
    console.error('Twilio status callback failed:', error);
    return NextResponse.json({ error: 'Call status callback failed.' }, { status: 500 });
  }
}
