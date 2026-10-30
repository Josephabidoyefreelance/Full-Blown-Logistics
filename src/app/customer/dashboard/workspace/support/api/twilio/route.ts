import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function validTwilioSignature(url: string, params: URLSearchParams, signature: string, token: string) {
  const base = url + [...new Set(Array.from(params.keys()))].sort().map((key) => {
    return key + (params.getAll(key).join('') || '');
  }).join('');
  const expected = createHmac('sha1', token).update(base, 'utf8').digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service configuration is missing.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new NextResponse('Twilio webhook is not configured.', { status: 503 });

  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') params.append(key, value);
  }

  const signature = request.headers.get('x-twilio-signature') || '';
  if (!validTwilioSignature(request.url, params, signature, token)) {
    return new NextResponse('Invalid Twilio signature.', { status: 403 });
  }

  const from_number = String(params.get('From') || '').trim();
  const to_number = String(params.get('To') || '').trim();
  const message = String(params.get('Body') || '').trim();
  const provider_sid = String(params.get('MessageSid') || params.get('SmsMessageSid') || '').trim();

  if (!from_number || !to_number || !provider_sid) {
    return new NextResponse('Missing SMS fields.', { status: 400 });
  }

  try {
    const supabase = serviceSupabase();
    // Twilio may retry webhooks. The unique provider_sid index prevents duplicate records.
    const { error } = await supabase.from('support_sms').upsert({
      from_number,
      to_number,
      message,
      status: 'Received',
      direction: 'inbound',
      provider_sid,
    }, { onConflict: 'provider_sid', ignoreDuplicates: true });

    if (error) return new NextResponse('Could not store inbound SMS.', { status: 500 });

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } },
    );
  } catch {
    return new NextResponse('Webhook server configuration error.', { status: 500 });
  }
}
