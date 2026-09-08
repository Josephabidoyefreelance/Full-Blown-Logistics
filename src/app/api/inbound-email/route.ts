import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { Resend } from 'resend';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Service-role client: bypasses RLS since this route has no logged-in user session.
// SUPABASE_SERVICE_ROLE_KEY must stay server-only, never expose it with NEXT_PUBLIC_.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET is not set.' }, { status: 500 });
  }

  const rawBody = await req.text();
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers.' }, { status: 400 });
  }

  let event: any;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true });
  }

  const emailId = event.data.email_id;
  const fromAddress = event.data.from ?? '';
  const subject = event.data.subject ?? '(no subject)';

  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set.' }, { status: 500 });
  }

  // The webhook payload is metadata only; fetch the actual body separately.
  const { data: fullEmail, error: fetchError } = await resend.emails.receiving.get(emailId);
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const body = fullEmail?.html ?? fullEmail?.text ?? '';

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  const { error: insertError } = await supabase.from('support_emails').insert({
    direction: 'inbound',
    to_address: fromAddress,
    subject,
    body,
    status: 'Received',
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
