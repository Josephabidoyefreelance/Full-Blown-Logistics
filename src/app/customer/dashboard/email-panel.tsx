'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendCustomerEmail } from './customer-email-actions';

type EmailRow = {
  id: string;
  direction: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};

export default function EmailPanel({ userId }: { userId: string }) {
  const supabase = createClient();
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel(`support_emails_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_emails', filter: `customer_user_id=eq.${userId}` },
        () => fetchEmails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEmails() {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_emails')
      .select('id, direction, subject, body, status, created_at')
      .eq('customer_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not have customer_user_id yet if the migration hasn't run.
      setEmails([]);
      setLoading(false);
      return;
    }
    setEmails(data ?? []);
    setLoading(false);
  }

  function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    fd.set('subject', subject);
    fd.set('body', body);

    startTransition(async () => {
      const res = await sendCustomerEmail(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSubject('');
      setBody('');
      setSuccess(true);
      fetchEmails();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h4 className="mb-1 text-sm font-bold text-[var(--text)]">Email support</h4>
        <p className="mb-4 text-[13px] text-[var(--subtext)]">
          Send an email to our support team directly from here. It goes straight into our support inbox.
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-[13px] text-[var(--error-text)]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-md border border-green-800/40 bg-green-900/20 p-3 text-[13px] text-green-400">
            Email sent.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isPending || !subject.trim() || !body.trim()}
            className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send email'}
          </button>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-[var(--text)]">Your email history</h4>
        {loading ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--subtext)]">
            Loading...
          </div>
        ) : emails.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--subtext)]">
            No emails sent yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
            {emails.map((em) => (
              <div key={em.id} className="border-b border-[var(--border)] p-4 last:border-b-0">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text)]">{em.subject}</span>
                  <span className="text-[11px] text-[var(--subtext)]">
                    {new Date(em.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="mb-1 whitespace-pre-wrap text-[13px] text-[var(--subtext)]">{em.body}</p>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: em.status === 'Sent' ? '#1f9d5c' : em.status === 'Failed' ? '#b8140d' : '#ca8a04' }}
                >
                  {em.status}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-[var(--subtext)]">
          Replies from our team currently arrive in your regular inbox at your registered email address, not back
          into this thread. In-app replies need an inbound-email connection set up on the server side.
        </p>
      </div>
    </div>
  );
}
