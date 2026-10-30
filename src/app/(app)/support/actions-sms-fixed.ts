'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function updateTicket(id: string, field: 'priority' | 'status', value: string) {
  const supabase = await createClient();
  const patch: Record<string, string> = { [field]: value };
  if (field === 'status' && value === 'Resolved') patch.closed_at = new Date().toISOString();
  const { error } = await supabase.from('tickets').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- Live chat ----------

export async function createLiveChat(formData: FormData) {
  const supabase = await createClient();
  const customer_name = String(formData.get('customer_name') ?? '').trim();
  if (!customer_name) return { error: 'Customer name is required.' };

  const { error } = await supabase.from('live_chats').insert({ customer_name, status: 'Open' });
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function updateLiveChatStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('live_chats').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function markEmailRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('support_emails').update({ read: true }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function sendLiveChatMessage(chatId: string, message: string) {
  if (!message.trim()) return { error: 'Message is empty.' };
  const supabase = await createClient();
  const { error } = await supabase.from('live_chat_messages').insert({
    chat_id: chatId,
    sender: 'agent',
    message,
  });
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- Email ----------

function splitAddresses(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function sendSupportEmail(formData: FormData) {
  const supabase = await createClient();

  const to_address = String(formData.get('to_address') ?? '').trim();
  const cc = splitAddresses(String(formData.get('cc') ?? ''));
  const bcc = splitAddresses(String(formData.get('bcc') ?? ''));
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const isDraft = formData.get('save_as_draft') === 'true';
  const attachmentFiles = formData.getAll('attachments').filter((f): f is File => f instanceof File && f.size > 0);

  if (!to_address && !isDraft) return { error: 'Recipient is required.' };
  if (!isDraft && !to_address) return { error: 'Recipient is required.' };

  let status = isDraft ? 'Draft' : 'Sent';

  if (!isDraft) {
    if (!to_address) return { error: 'Recipient is required.' };
    if (!resend || !process.env.EMAIL_FROM) {
      return { error: 'Email sending is not configured. Set RESEND_API_KEY and EMAIL_FROM in your environment, then restart the server.' };
    }

    const attachments = await Promise.all(
      attachmentFiles.map(async (file) => ({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
      }))
    );

      const { error: sendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: to_address,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject,
      html: body || '<p></p>',
      attachments: attachments.length ? attachments : undefined,
    });
    if (sendError) status = 'Failed';
  }

  const attachmentMetadata = attachmentFiles.map((file) => ({
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
  }));
  const { error } = await supabase.from('support_emails').insert({
    direction: 'outbound',
    from_address: process.env.EMAIL_FROM || null,
    to_address,
    subject,
    body,
    attachments: attachmentMetadata,
    status,
  });

  if (error) return { error: error.message };
  if (status === 'Failed') return { error: 'Email could not be sent. Check your Resend API key and that your sending domain is verified.' };
  revalidatePath('/support');
  return { error: null };
}

// ---------- SMS ----------

export async function sendSupportSms(formData: FormData) {
  const supabase = await createClient();

  const rawNumber = String(formData.get('to_number') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (!rawNumber || !message) return { error: 'Recipient and message are required.' };
  if (message.length > 320) return { error: 'SMS message must be 320 characters or fewer.' };

  // Normalize common Nigerian local numbers to E.164.
  const compact = rawNumber.replace(/[\s().-]/g, '');
  const to_number = /^0\d{10}$/.test(compact)
    ? `+234${compact.slice(1)}`
    : compact.startsWith('+') ? compact : '';

  if (!to_number || !/^\+[1-9]\d{7,14}$/.test(to_number)) {
    return { error: 'Enter a valid phone number, preferably in international format, e.g. +2347062869423.' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Use a number that is actually enabled for SMS. A voice-verified caller ID may not support SMS.
  const fromNumber = process.env.TWILIO_SMS_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    return { error: 'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM (an SMS-capable Twilio number) in your environment.' };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''))
    .replace(/\/$/, '');
  const statusCallback = appUrl ? `${appUrl}/api/twilio/sms/status` : undefined;

  // Create an honest pending record first. It is never marked Delivered just because
  // the API request succeeded; Twilio's callback supplies later delivery updates.
  const { data: record, error: insertError } = await supabase
    .from('support_sms')
    .insert({
      from_number: fromNumber,
      to_number,
      message,
      status: 'Submitting',
      direction: 'outbound',
    })
    .select('id')
    .single();

  if (insertError || !record) {
    return { error: `Could not save SMS record: ${insertError?.message ?? 'Unknown database error'}` };
  }

  try {
    const body = new URLSearchParams({
      To: to_number,
      From: fromNumber,
      Body: message,
    });
    if (statusCallback) body.set('StatusCallback', statusCallback);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        cache: 'no-store',
      },
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerError = result?.message || result?.detail || `Twilio returned HTTP ${response.status}.`;
      await supabase.from('support_sms').update({ status: 'Failed' }).eq('id', record.id);
      revalidatePath('/support');
      return { error: `SMS failed: ${providerError}` };
    }

    const providerStatus = String(result?.status || 'queued');
    const { error: updateError } = await supabase
      .from('support_sms')
      .update({
        status: providerStatus,
        provider_sid: result?.sid || null,
      })
      .eq('id', record.id);

    if (updateError) {
      revalidatePath('/support');
      return { error: `Twilio accepted the SMS, but the ERP could not update its record: ${updateError.message}. Check the message in Twilio before retrying to avoid sending it twice.` };
    }

    revalidatePath('/support');
    return { error: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown network error';
    await supabase.from('support_sms').update({ status: 'Failed' }).eq('id', record.id);
    revalidatePath('/support');
    return { error: `SMS request failed before confirmation: ${reason}` };
  }
}

// ---------- Call ----------

export async function logSupportCall(formData: FormData, status = 'Call attempt logged') {
  const supabase = await createClient();

  const number = String(formData.get('number') ?? '').trim();
  if (!number) return { error: 'Number is required.' };

  const allowedStatuses = new Set([
    'Call attempt logged',
    'Initiated via Twilio',
    'Ringing',
    'Answered',
    'Declined / Busy',
    'Unanswered',
    'Failed',
    'Inbound Ringing',
    'Inbound Answered',
    'Inbound Missed',
    'Inbound Declined',
    'Inbound Failed',
  ]);
  const safeStatus = allowedStatuses.has(status) ? status : 'Call attempt logged';

  const { data, error } = await supabase
    .from('support_calls')
    .insert({ number, status: safeStatus })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null, id: data.id };
}

export async function updateSupportCallStatus(id: string, status: string) {
  const supabase = await createClient();
  const allowedStatuses = new Set([
    'Ringing',
    'Answered',
    'Declined / Busy',
    'Unanswered',
    'Failed',
    'Inbound Answered',
    'Inbound Missed',
    'Inbound Declined',
    'Inbound Failed',
  ]);

  if (!id || !allowedStatuses.has(status)) {
    return { error: 'Invalid call status update.' };
  }

  const { error } = await supabase
    .from('support_calls')
    .update({ status })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- WhatsApp ----------

export async function sendSupportWhatsapp(formData: FormData) {
  const supabase = await createClient();

  const to_number = String(formData.get('to_number') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!to_number || !message) return { error: 'Recipient and message are required.' };

  const { error } = await supabase.from('support_whatsapp').insert({
    to_number,
    message,
    direction: 'outbound',
  });

  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- New ticket ----------

async function nextTicketNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from('tickets').select('ticket_no');
  let maxNum = 2280;
  for (const row of data ?? []) {
    const match = String(row.ticket_no ?? '').match(/(\d+)$/);
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }
  return `TCK-${maxNum + 1}`;
}

export async function createTicket(formData: FormData) {
  const supabase = await createClient();

  const customer_name = String(formData.get('customer_name') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const channel = String(formData.get('channel') ?? 'Email');
  const priority = String(formData.get('priority') ?? 'Normal');

  if (!customer_name || !subject || !message) return { error: 'Customer, subject and message are required.' };

  const ticket_no = await nextTicketNo(supabase);

  const { error } = await supabase.from('tickets').insert({
    ticket_no,
    customer_name,
    subject,
    message,
    channel,
    priority,
    status: 'Open',
    opened_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- Team chat ----------

export async function sendTeamChatMessage(senderName: string, message: string, recipientName: string | null = null) {
  if (!message.trim()) return { error: 'Message is empty.' };
  const supabase = await createClient();
  const payload: { sender_name: string; message: string; recipient_name?: string | null } = {
    sender_name: senderName,
    message: message.trim(),
  };
  if (recipientName) payload.recipient_name = recipientName;
  const { error } = await supabase.from('team_chat_messages').insert(payload);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}


export async function markTeamChatRead(currentUserName: string, senderName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('team_chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_name', senderName)
    .eq('recipient_name', currentUserName)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- Chat file attachments ----------

export async function uploadLiveChatFile(chatId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file selected.' };

  const path = `livechat/${chatId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from('chat-attachments').getPublicUrl(path);

  const { error } = await supabase.from('live_chat_messages').insert({
    chat_id: chatId,
    sender: 'agent',
    message: `📎 ${file.name}|${pub.publicUrl}`,
  });
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function uploadTeamChatFile(senderName: string, formData: FormData, recipientName: string | null = null) {
  const supabase = await createClient();
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file selected.' };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `teamchat/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from('chat-attachments').getPublicUrl(path);

  const payload: { sender_name: string; message: string; recipient_name?: string | null } = {
    sender_name: senderName,
    message: `📎 ${file.name}|${pub.publicUrl}`,
  };
  if (recipientName) payload.recipient_name = recipientName;
  const { error } = await supabase.from('team_chat_messages').insert(payload);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function getStaffNames() {
  const supabase = await createClient();
  const { data } = await supabase.from('employees').select('name').not('name', 'is', null);
  return (data ?? []).map((p) => p.name).filter(Boolean) as string[];
}

// ---------- Knowledge base ----------

export async function createKbArticle(formData: FormData) {
  const supabase = await createClient();

  const question = String(formData.get('question') ?? '').trim();
  const answer = String(formData.get('answer') ?? '').trim();

  if (!question || !answer) return { error: 'Question and answer are required.' };

  const { error } = await supabase.from('kb_articles').insert({ question, answer });
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function updateKbArticle(id: string, formData: FormData) {
  const supabase = await createClient();

  const question = String(formData.get('question') ?? '').trim();
  const answer = String(formData.get('answer') ?? '').trim();

  if (!question || !answer) return { error: 'Question and answer are required.' };

  const { error } = await supabase.from('kb_articles').update({ question, answer }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function deleteKbArticle(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('kb_articles').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}
