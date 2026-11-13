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

export async function POST(request: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !key) return new NextResponse('Webhook is not configured.', { status: 503 });

  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') params.append(name, value);
  }
  const signature = request.headers.get('x-twilio-signature') || '';
  if (!validTwilioSignature(request.url, params, signature, token)) {
    return new NextResponse('Invalid Twilio signature.', { status: 403 });
  }

  const sid = String(params.get('MessageSid') || '').trim();
  const status = String(params.get('MessageStatus') || params.get('SmsStatus') || '').trim().toLowerCase();
  const errorCode = String(params.get('ErrorCode') || '').trim();
  const statusMessage = errorCode ? `Twilio error code ${errorCode}` : null;
  if (!sid || !status) return new NextResponse('Missing status fields.', { status: 400 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('support_sms').update({ status, error_code: errorCode || null, status_message: statusMessage }).eq('provider_sid', sid);
  if (error) return new NextResponse('Could not update SMS status.', { status: 500 });

  return new NextResponse('OK', { status: 200 });
}
