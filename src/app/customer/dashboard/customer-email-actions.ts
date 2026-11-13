'use server';

import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Sends an email from the customer portal using the same Resend setup as
// the admin ERP, and logs it into support_emails so admin staff see it in
// their existing support inbox too.
export async function sendCustomerEmail(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { data: profile } = await supabase.from('profiles').select('company_id, status').eq('id', user.id).maybeSingle();
  if (!profile?.company_id || String(profile.status ?? 'active').toLowerCase() !== 'active') return { error: 'Active company workspace required.' };
  const { data: inbox, error: inboxError } = await supabase.from('support_inbound_addresses')
    .select('address').eq('company_id', profile.company_id).limit(2);
  if (inboxError || !inbox || inbox.length !== 1) return { error: 'A unique company support inbox must be configured.' };
  const companyInbox = inbox[0].address;


  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!subject || !body) return { error: 'Subject and message are required.' };

  if (!resend || !process.env.EMAIL_FROM) {
    return {
      error:
        'Email sending is not configured. Set RESEND_API_KEY and EMAIL_FROM in your environment.',
    };
  }

  let status = 'Sent';

  let sendError: { message: string } | null = null;
  try {
    const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: companyInbox,
    replyTo: user.email,
    subject: `[Customer] ${subject}`,
    html: `<div style="white-space:pre-wrap">${body.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c)}</div>`,
    });
    sendError = result.error;
  } catch { sendError = { message: 'Email provider unavailable.' }; }

  if (sendError) status = 'Failed';

  const { error } = await supabase.from('support_emails').insert({
    company_id: profile.company_id,
    direction: 'outbound',
    customer_user_id: user.id,
    to_address: companyInbox,
    subject,
    body,
    status,
  });

  if (error) return { error: error.message };
  if (status === 'Failed') {
    return { error: 'Email could not be sent. Check your Resend API key and sending domain.' };
  }
  return { error: null };
}
