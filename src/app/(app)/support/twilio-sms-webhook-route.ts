import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validTwilioSignature(url: string, params: URLSearchParams, token: string, signature: string) {
  let payload = url;
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) payload += key + value;
  const expected = createHmac('sha1', token).update(payload, 'utf8').digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!authToken || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'SMS webhook is not configured.' }, { status: 503 });
  }

  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const signature = request.headers.get('x-twilio-signature') || '';
  // Use the public URL Twilio called. Configure this endpoint using the exact deployed URL.
  if (!validTwilioSignature(request.url, params, authToken, signature)) {
    return NextResponse.json({ error: 'Invalid Twilio signature.' }, { status: 403 });
  }

  const from_number = (params.get('From') || '').trim();
  const to_number = (params.get('To') || '').trim();
  const message = (params.get('Body') || '').trim();
  const messageSid = (params.get('MessageSid') || '').trim();

  if (!from_number || !to_number || !message) {
    return NextResponse.json({ error: 'Missing sender, recipient, or message.' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Twilio may retry webhook deliveries. Avoid duplicate records when possible.
  // Existing schema may not have a provider SID column, so save only known SMS columns.
  const { data: existing, error: lookupError } = messageSid
    ? await supabase.from('support_sms').select('id').eq('provider_sid', messageSid).maybeSingle()
    : { data: null, error: null };

  if (!lookupError && existing) {
    return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml; charset=utf-8' } });
  }

  const { error } = await supabase.from('support_sms').insert({
    from_number,
    to_number,
    message,
    status: 'Received',
    direction: 'inbound',
    provider_sid: messageSid || null,
  });

  if (error) {
    // Some installations may not yet have direction/provider_sid columns. Fail clearly
    // rather than silently losing an inbound message; run the supplied SQL migration.
    console.error('Failed to save inbound Twilio SMS:', error.message);
    return NextResponse.json({ error: 'Could not save inbound SMS. Apply the SMS migration and check Supabase permissions.' }, { status: 500 });
  }

  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
