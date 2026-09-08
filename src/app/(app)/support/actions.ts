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
    if (sendError) {
      status = 'Failed';
    }
  }

  const { error } = await supabase.from('support_emails').insert({
    direction: 'outbound',
    to_address,
    subject,
    body,
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

  const to_number = String(formData.get('to_number') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!to_number || !message) return { error: 'Recipient and message are required.' };

  const { error } = await supabase.from('support_sms').insert({
    to_number,
    message,
    status: 'Logged (no SMS provider connected)',
  });

  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

// ---------- Call ----------

export async function logSupportCall(formData: FormData) {
  const supabase = await createClient();

  const number = String(formData.get('number') ?? '').trim();
  if (!number) return { error: 'Number is required.' };

  const { error } = await supabase.from('support_calls').insert({
    number,
    status: 'Logged (no voice provider connected)',
  });

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
  const channel = String(formData.get('channel') ?? 'Email');
  const priority = String(formData.get('priority') ?? 'Normal');

  if (!customer_name || !subject) return { error: 'Customer and subject are required.' };

  const ticket_no = await nextTicketNo(supabase);

  const { error } = await supabase.from('tickets').insert({
    ticket_no,
    customer_name,
    subject,
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

export async function sendTeamChatMessage(senderName: string, message: string) {
  if (!message.trim()) return { error: 'Message is empty.' };
  const supabase = await createClient();
  const { error } = await supabase.from('team_chat_messages').insert({
    sender_name: senderName,
    message,
  });
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

export async function uploadTeamChatFile(senderName: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file selected.' };

  const path = `teamchat/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from('chat-attachments').getPublicUrl(path);

  const { error } = await supabase.from('team_chat_messages').insert({
    sender_name: senderName,
    message: `📎 ${file.name}|${pub.publicUrl}`,
  });
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
