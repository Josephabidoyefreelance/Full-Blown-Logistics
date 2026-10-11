import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  if (!resend || !supabaseUrl || !serviceRoleKey || !process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Inbound email integration is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();
  let event: { type?: string; data?: { email_id?: string; from?: string; to?: string[]; subject?: string; created_at?: string } };
  try {
    const headers = {
      id: request.headers.get('svix-id') || '',
      timestamp: request.headers.get('svix-timestamp') || '',
      signature: request.headers.get('svix-signature') || '',
    };
    event = await resend.webhooks.verify({
      payload: rawBody,
      headers,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  if (event.type !== 'email.received' || !event.data?.email_id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const emailId = event.data.email_id;
  const { data: existing, error: existingError } = await db
    .from('support_emails').select('id').eq('provider_email_id', emailId).maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  const { data: message, error: messageError } = await resend.emails.receiving.get(emailId);
  if (messageError || !message) {
    return NextResponse.json({ error: messageError?.message || 'Could not retrieve inbound message.' }, { status: 502 });
  }

  const { data: attachmentResponse } = await resend.emails.receiving.attachments.list({ emailId });
  const attachmentRows = Array.isArray(attachmentResponse) ? attachmentResponse : (attachmentResponse as { data?: unknown[] } | null)?.data ?? [];
  const attachments = attachmentRows.map((item) => {
    const file = item as { id?: string; filename?: string | null; content_type?: string; size?: number; download_url?: string; expires_at?: string };
    return { id: file.id, filename: file.filename || 'attachment', content_type: file.content_type, size: file.size, download_url: file.download_url, expires_at: file.expires_at };
  });

  const row = {
    direction: 'inbound',
    provider_email_id: emailId,
    from_address: message.from || event.data.from || 'Unknown sender',
    to_address: Array.isArray(message.to) ? message.to[0] : (event.data.to?.[0] || ''),
    subject: message.subject || event.data.subject || '(no subject)',
    body: message.html || (message.text ? `<pre>${escapeHtml(message.text)}</pre>` : ''),
    status: 'Received',
    read: false,
    created_at: message.created_at || event.data.created_at || new Date().toISOString(),
    attachments,
  };
  const { error: insertError } = await db.from('support_emails').insert(row);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ received: true });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}
