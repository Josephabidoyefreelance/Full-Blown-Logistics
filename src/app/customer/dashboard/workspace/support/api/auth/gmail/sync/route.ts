import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptGmailToken } from '@/lib/gmail-token';

export const runtime = 'nodejs';
export const maxDuration = 60;

type GmailHeader = { name?: string; value?: string };
type GmailPart = { mimeType?: string; filename?: string; headers?: GmailHeader[]; body?: { data?: string; attachmentId?: string; size?: number }; parts?: GmailPart[] };
type GmailMessage = { id: string; threadId?: string; internalDate?: string; payload?: GmailPart; snippet?: string };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is not configured.');
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function header(part: GmailPart | undefined, name: string) {
  return part?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}
function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function collectParts(part: GmailPart | undefined, output: GmailPart[] = []): GmailPart[] {
  if (!part) return output;
  output.push(part);
  for (const child of part.parts || []) collectParts(child, output);
  return output;
}
function cleanFilename(value: string) {
  return value.replace(/[\\/\0-\x1f]/g, '_').slice(0, 160) || 'attachment';
}

export async function POST() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to JAAD ERP first.' }, { status: 401 });

  try {
    const admin = adminClient();
    const { data: connection, error: connectionError } = await admin.from('gmail_connections')
      .select('gmail_address, encrypted_refresh_token').eq('user_id', user.id).maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) return NextResponse.json({ error: 'Gmail is not connected.', connect: true }, { status: 409 });

    const refreshToken = decryptGmailToken(connection.encrypted_refresh_token);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', refresh_token: refreshToken, grant_type: 'refresh_token' }), cache: 'no-store',
    });
    const tokenJson = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenJson.access_token) throw new Error(`Google token refresh failed: ${tokenJson.error || tokenResponse.status}`);
    const accessToken = tokenJson.access_token;

    const listResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=50&q=newer_than:60d', {
      headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store',
    });
    const listJson = await listResponse.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
    if (!listResponse.ok) throw new Error(listJson.error?.message || 'Gmail messages could not be listed.');
    const messages = listJson.messages || [];
    let imported = 0;
    let skipped = 0;

    for (const listed of messages) {
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(listed.id)}?format=full`, {
        headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store',
      });
      const detail = await detailResponse.json() as GmailMessage & { error?: { message?: string } };
      if (!detailResponse.ok) { skipped++; continue; }

      const { data: already, error: existsError } = await admin.from('support_emails').select('id')
        .eq('gmail_account', connection.gmail_address).eq('gmail_message_id', detail.id).maybeSingle();
      if (existsError) throw existsError;
      if (already) { skipped++; continue; }

      const payload = detail.payload;
      const parts = collectParts(payload);
      const htmlPart = parts.find((p) => p.mimeType === 'text/html' && p.body?.data);
      const plainPart = parts.find((p) => p.mimeType === 'text/plain' && p.body?.data);
      let body = htmlPart?.body?.data ? decodeBase64Url(htmlPart.body.data) : plainPart?.body?.data ? `<p>${decodeBase64Url(plainPart.body.data).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>')}</p>` : `<p>${(detail.snippet || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
      // Keep the message body displayable but remove executable script blocks from imported HTML.
      body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

      const attachmentMetadata: Array<{ filename: string; content_type: string; size: number; url: string }> = [];
      for (const part of parts.filter((p) => p.filename && p.body?.attachmentId)) {
        const attachmentResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(detail.id)}/attachments/${encodeURIComponent(part.body!.attachmentId!)}`, {
          headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store',
        });
        if (!attachmentResponse.ok) continue;
        const attachment = await attachmentResponse.json() as { data?: string; size?: number };
        if (!attachment.data) continue;
        const bytes = Buffer.from(attachment.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        const filename = cleanFilename(part.filename || 'attachment');
        const storagePath = `${user.id}/${connection.gmail_address}/${detail.id}/${filename}`;
        const { error: uploadError } = await admin.storage.from('email-attachments').upload(storagePath, bytes, {
          contentType: part.mimeType || 'application/octet-stream', upsert: true,
        });
        if (uploadError) {
          console.error('Gmail attachment storage failed:', uploadError.message);
          continue;
        }
        attachmentMetadata.push({
          filename,
          content_type: part.mimeType || 'application/octet-stream',
          size: attachment.size || bytes.byteLength,
          url: `/api/support/email-attachment?path=${encodeURIComponent(storagePath)}`,
        });
      }

      const toAddress = header(payload, 'To') || connection.gmail_address;
      const fromAddress = header(payload, 'From') || 'Unknown sender';
      const subject = header(payload, 'Subject') || '(no subject)';
      const dateHeader = header(payload, 'Date');
      const parsedDate = dateHeader ? new Date(dateHeader) : new Date(Number(detail.internalDate || Date.now()));
      const createdAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      const { error: insertError } = await admin.from('support_emails').insert({
        direction: 'inbound', from_address: fromAddress, to_address: toAddress, subject, body,
        status: 'Received', read: false, created_at: createdAt, attachments: attachmentMetadata,
        gmail_account: connection.gmail_address, gmail_message_id: detail.id, gmail_thread_id: detail.threadId || null,
      });
      if (insertError) {
        if (insertError.code === '23505') { skipped++; continue; }
        throw insertError;
      }
      imported++;
    }

    return NextResponse.json({ ok: true, account: connection.gmail_address, imported, skipped, checked: messages.length });
  } catch (error) {
    console.error('Gmail sync failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gmail sync failed.' }, { status: 500 });
  }
}
