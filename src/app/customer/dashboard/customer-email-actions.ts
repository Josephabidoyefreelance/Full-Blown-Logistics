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

  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!subject || !body) return { error: 'Subject and message are required.' };

  if (!resend || !process.env.EMAIL_FROM || !process.env.SUPPORT_INBOX_EMAIL) {
    return {
      error:
        'Email sending is not configured. Set RESEND_API_KEY, EMAIL_FROM, and SUPPORT_INBOX_EMAIL in your environment, then restart the server.',
    };
  }

  let status = 'Sent';

  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: process.env.SUPPORT_INBOX_EMAIL,
    replyTo: user.email,
    subject: `[Customer] ${subject}`,
    html: `<p>${body.replace(/\n/g, '<br />')}</p><p style="color:#888;font-size:12px">From: ${user.email}</p>`,
  });

  if (sendError) status = 'Failed';

  const { error } = await supabase.from('support_emails').insert({
    direction: 'outbound',
    customer_user_id: user.id,
    to_address: process.env.SUPPORT_INBOX_EMAIL,
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
