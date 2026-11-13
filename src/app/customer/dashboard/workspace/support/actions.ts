'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { getCustomerTenantContext } from '@/lib/customer-tenant';


// Stage 20: server-side authorization, applied to every tenant.
// This does not replace table RLS or participant-level chat permissions.
async function requireWorkspacePermission(moduleKey: 'support' | 'team_chat') {
  const tenant = await getCustomerTenantContext();
  if (!tenant) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('auth_has_module', { module_key: moduleKey });
  if (error || data !== true) return null;
  return tenant;
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function updateTicket(id: string, field: 'priority' | 'status', value: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  if (!id) return { error: 'Ticket ID is missing.' };

  const allowedValues: Record<'priority' | 'status', readonly string[]> = {
    priority: ['Low', 'Normal', 'High', 'Urgent'],
    status: ['Open', 'Resolved'],
  };
  if (!allowedValues[field].includes(value)) {
    return { error: `Invalid ticket ${field}.` };
  }

  const supabase = await createClient();
  const patch: Record<string, string | null> = { [field]: value };
  if (field === 'status') {
    // Set the close timestamp on resolution and clear it when a ticket is reopened.
    patch.closed_at = value === 'Resolved' ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(patch)
    .eq('id', id)
    .eq('company_id', access.companyId)
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) {
    return { error: 'No ticket was updated. Check the tickets table permissions (Supabase RLS) for the signed-in user.' };
  }

  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- Live chat ----------

export async function createLiveChat(formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();
  const customer_name = String(formData.get('customer_name') ?? '').trim();
  if (!customer_name) return { error: 'Customer name is required.' };

  const { error } = await supabase.from('live_chats').insert({ customer_name, status: 'Open', company_id: access.companyId });
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

export async function updateLiveChatStatus(id: string, status: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();
  const { error } = await supabase.from('live_chats').update({ status }).eq('id', id).eq('company_id', access.companyId);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

export async function markEmailRead(id: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();
  const { error } = await supabase.from('support_emails').update({ read: true }).eq('id', id).eq('company_id', access.companyId);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

export async function sendLiveChatMessage(chatId: string, message: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  if (!message.trim()) return { error: 'Message is empty.' };
  const supabase = await createClient();
  const { data: ownedChat, error: ownershipError } = await supabase.from('live_chats')
    .select('id').eq('id', chatId).eq('company_id', access.companyId).maybeSingle();
  if (ownershipError || !ownedChat) return { error: 'Conversation not found or unauthorized.' };
  const { error } = await supabase.from('live_chat_messages').insert({
    company_id: access.companyId,
    chat_id: chatId,
    sender: 'agent',
    message,
  });
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
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
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
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
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- SMS ----------

export async function sendSupportSms(formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
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
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- Call ----------

export async function logSupportCall(formData: FormData, status = 'Call attempt logged') {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
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
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null, id: data.id };
}

export async function updateSupportCallStatus(id: string, status: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
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
    .eq('id', id)
    .eq('company_id', access.companyId);

  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- WhatsApp ----------

export async function sendSupportWhatsapp(formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
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
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- New ticket ----------

async function nextTicketNo(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const { data } = await supabase.from('tickets').select('ticket_no').eq('company_id', companyId);
  let maxNum = 2280;
  for (const row of data ?? []) {
    const match = String(row.ticket_no ?? '').match(/(\d+)$/);
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }
  return `TCK-${maxNum + 1}`;
}

export async function createTicket(formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();

  const customer_name = String(formData.get('customer_name') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const channel = String(formData.get('channel') ?? 'Email');
  const priority = String(formData.get('priority') ?? 'Normal');

  if (!customer_name || !subject || !message) return { error: 'Customer, subject and message are required.' };

  const ticket_no = await nextTicketNo(supabase, access.companyId);

  const { error } = await supabase.from('tickets').insert({
    company_id: access.companyId,
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
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- Team chat ----------

export async function sendTeamChatMessage(senderName: string, message: string, recipientName: string | null = null) {
  const access = await requireWorkspacePermission('team_chat');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  if (!message.trim()) return { error: 'Message is empty.' };
  const supabase = await createClient();
  const payload: { company_id: string; sender_name: string; message: string; recipient_name?: string | null } = {
    company_id: access.companyId,
    sender_name: senderName,
    message: message.trim(),
  };
  if (recipientName) payload.recipient_name = recipientName;
  const { error } = await supabase.from('team_chat_messages').insert(payload);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}


export async function markTeamChatRead(currentUserName: string, senderName: string) {
  const access = await requireWorkspacePermission('team_chat');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('team_chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_name', senderName)
    .eq('recipient_name', currentUserName)
    .eq('company_id', access.companyId)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

// ---------- Chat file attachments ----------

export async function uploadLiveChatFile(chatId: string, formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(chatId)) return { error: 'Invalid chat ID.' };
  const supabase = await createClient();
  const { data: chat, error: chatError } = await supabase.from('live_chats')
    .select('id,company_id').eq('id', chatId).eq('company_id', access.companyId).maybeSingle();
  if (chatError || !chat) return { error: 'Chat not found in your company.' };
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected.' };
  const types: Record<string, string> = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'application/pdf':'pdf' };
  const ext = types[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) return { error: 'Only JPG, PNG, WebP or PDF up to 5 MB is allowed.' };
  const path = `${access.companyId}/${chatId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };
  const { error: messageError } = await supabase.from('live_chat_messages').insert({
    chat_id: chatId, company_id: access.companyId, sender: 'agent', message: `📎 ${file.name}|chat-attachment:${path}`
  });
  if (messageError) {
    await supabase.storage.from('chat-attachments').remove([path]);
    return { error: messageError.message };
  }
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

/** Returns a temporary download link only for a chat in the active company. */
export async function getLiveChatAttachmentUrl(chatId: string, path: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized.', url: null };
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(chatId) ||
      !path.startsWith(`${access.companyId}/${chatId}/`) || path.includes('..')) {
    return { error: 'Invalid attachment path.', url: null };
  }
  const supabase = await createClient();
  const { data: chat } = await supabase.from('live_chats').select('id')
    .eq('id', chatId).eq('company_id', access.companyId).maybeSingle();
  if (!chat) return { error: 'Unauthorized chat.', url: null };
  const { data, error } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 60);
  return error ? { error: error.message, url: null } : { error: null, url: data.signedUrl };
}

export async function uploadTeamChatFile(senderName: string, formData: FormData, recipientName: string | null = null) {
  const access = await requireWorkspacePermission('team_chat');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  return { error: 'Private attachment access is pending Stage 21 security implementation.' };
}

export async function getStaffNames() {
  const access = await requireWorkspacePermission('support');
  if (!access) return [];
  const supabase = await createClient();
  const { data } = await supabase.from('employees').select('name').eq('company_id', access.companyId).not('name', 'is', null);
  return (data ?? []).map((p) => p.name).filter(Boolean) as string[];
}

// ---------- Knowledge base ----------

export async function createKbArticle(formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();

  const question = String(formData.get('question') ?? '').trim();
  const answer = String(formData.get('answer') ?? '').trim();

  if (!question || !answer) return { error: 'Question and answer are required.' };

  const { error } = await supabase.from('kb_articles').insert({ company_id: access.companyId, question, answer });
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

export async function updateKbArticle(id: string, formData: FormData) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();

  const question = String(formData.get('question') ?? '').trim();
  const answer = String(formData.get('answer') ?? '').trim();

  if (!question || !answer) return { error: 'Question and answer are required.' };

  const { error } = await supabase.from('kb_articles').update({ question, answer }).eq('id', id).eq('company_id', access.companyId);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}

export async function deleteKbArticle(id: string) {
  const access = await requireWorkspacePermission('support');
  if (!access) return { error: 'Unauthorized or subscription inactive.' };
  const supabase = await createClient();
  const { error } = await supabase.from('kb_articles').delete().eq('id', id).eq('company_id', access.companyId);
  if (error) return { error: error.message };
  revalidatePath('/customer/dashboard/workspace/support');
  return { error: null };
}
