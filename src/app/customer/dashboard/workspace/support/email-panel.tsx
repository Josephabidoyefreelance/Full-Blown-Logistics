'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSupportEmail, markEmailRead } from './actions';

type Email = { id: string; to_address: string; from_address?: string | null; subject: string; body: string; status: string; direction?: string; read?: boolean; created_at: string; scheduled_at?: string | null; category?: string | null; attachments?: Array<{ filename?: string; content_type?: string; download_url?: string; url?: string; size?: number }> | null };
type InboxCategory = 'Primary' | 'Promotions' | 'Social' | 'Updates' | 'Forums';

function getInboxCategory(email: Email): InboxCategory {
  const explicit = (email.category || '').toLowerCase();
  if (['primary', 'promotions', 'social', 'updates', 'forums'].includes(explicit)) {
    return (explicit[0].toUpperCase() + explicit.slice(1)) as InboxCategory;
  }
  const text = `${email.from_address || ''} ${email.to_address || ''} ${email.subject || ''} ${email.body || ''}`.toLowerCase();
  if (/facebook|instagram|linkedin|tiktok|twitter|x.com|social network|friend request|new follower/.test(text)) return 'Social';
  if (/promotion|sale|discount|offer|coupon|deal|newsletter|unsubscribe|limited time/.test(text)) return 'Promotions';
  if (/forum|discussion|thread|community|reply to topic|board notification/.test(text)) return 'Forums';
  if (/receipt|order|shipment|delivery|tracking|verification|security alert|statement|notification|update|invoice|payment|transaction/.test(text)) return 'Updates';
  return 'Primary';
}

const TOOLBAR_BTN =
  'flex h-7 w-7 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800';

function ToolbarIcon({ name }: { name: string }) {
  const cls = 'h-4 w-4';
  switch (name) {
    case 'bold':
      return <svg viewBox="0 0 24 24" fill="currentColor" className={cls}><path d="M7 4h6.5a4 4 0 013.4 6.1A4.2 4.2 0 0115.5 18H7V4zm3 3v4h3.3a2 2 0 000-4H10zm0 7v4h4a2 2 0 000-4h-4z"/></svg>;
    case 'italic':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M10 4h8M6 20h8M13 4L11 20"/></svg>;
    case 'underline':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M6 4v6a6 6 0 0012 0V4M4 20h16"/></svg>;
    case 'bullets':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none"/><path d="M9 6h11M9 12h11M9 18h11"/></svg>;
    case 'numbers':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5.5h1v3M3.6 8.5h1.8M3.6 12.2h1.8v1.4H3.6v1.4h1.8M3.6 17.8h1.4c.4 0 .7-.3.4-.7l-1.4-1.5c-.3-.4 0-.7.4-.7h1"/></svg>;
    case 'link':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M9 15l6-6M10 6l1.5-1.5a3.5 3.5 0 015 5L15 11M14 18l-1.5 1.5a3.5 3.5 0 01-5-5L9 13"/></svg>;
    case 'attach':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M21 11.5l-8.5 8.5a4.5 4.5 0 01-6.4-6.4L14 5.7a3 3 0 014.2 4.2l-7.9 7.9a1.5 1.5 0 01-2.2-2.2l7.4-7.4"/></svg>;
    case 'close':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'reply':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M9 14l-5-5 5-5M4 9h10a6 6 0 016 6v3"/></svg>;
    case 'forward':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cls}><path d="M15 14l5-5-5-5M20 9H10a6 6 0 00-6 6v3"/></svg>;
    default:
      return null;
  }
}

function EmailDetailModal({
  email,
  onClose,
  onReply,
  onForward,
}: {
  email: Email;
  onClose: () => void;
  onReply: (e: Email) => void;
  onForward: (e: Email) => void;
}) {
  const isInbound = email.direction === 'inbound';
  const senderOrRecipient = isInbound ? (email.from_address || email.to_address) : email.to_address;
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="pr-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {email.subject || '(no subject)'}
          </h2>
          <button onClick={onClose} className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
            <ToolbarIcon name="close" />
          </button>
        </div>

        <div className="border-b border-neutral-200 px-6 py-3 text-sm dark:border-neutral-800">
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-neutral-400">{isInbound ? 'From' : 'To'}</span>
            <span className="text-neutral-800 dark:text-neutral-200">{senderOrRecipient}</span>
          </div>
          <div className="mt-1 flex gap-2">
            <span className="w-14 shrink-0 text-neutral-400">Date</span>
            <span className="text-neutral-600 dark:text-neutral-400">{new Date(email.created_at).toLocaleString()}</span>
          </div>
          <div className="mt-1 flex gap-2">
            <span className="w-14 shrink-0 text-neutral-400">Status</span>
            <span className="text-neutral-600 dark:text-neutral-400">{email.status}{isInbound ? ' (received)' : ''}</span>
          </div>
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-6 py-4">
          <div
            className="email-body break-words text-[14px] leading-6 text-neutral-800 dark:text-neutral-200"
            dangerouslySetInnerHTML={{ __html: email.body || '<p class="text-neutral-400">(No message body was saved for this email.)</p>' }}
          />
          {attachments.length > 0 && (
            <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Attachments ({attachments.length})</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => {
                  const href = file.download_url || file.url;
                  return href ? <a key={`${file.filename || 'attachment'}-${index}`} href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-blue-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-blue-300 dark:hover:bg-neutral-800"><span aria-hidden="true">📎</span><span className="max-w-[240px] truncate">{file.filename || `Attachment ${index + 1}`}</span></a> : <span key={`${file.filename || 'attachment'}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">📎 {file.filename || `Attachment ${index + 1}`}</span>;
                })}
              </div>
            </div>
          )}
          <style>{`
            .email-body ul { list-style: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
            .email-body ol { list-style: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
            .email-body a { color: #dc2626; text-decoration: underline; }
          `}</style>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 dark:border-neutral-800">
          <span className="text-xs text-neutral-400">{attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? '' : 's'}` : 'No attachments on this email.'}</span>
          <div className="flex gap-2">
            {isInbound && (
              <button
                onClick={() => onReply(email)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <ToolbarIcon name="reply" /> Reply
              </button>
            )}
            <button
              onClick={() => onForward(email)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ToolbarIcon name="forward" /> Forward
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailPanel({ emails }: { emails: Email[] }) {
  const [tab, setTab] = useState<'compose' | 'inbox' | 'sent' | 'drafts' | 'scheduled'>('compose');
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeMaximized, setComposeMaximized] = useState(false);
  const [inboxCategory, setInboxCategory] = useState<InboxCategory>('Primary');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentPopup, setSentPopup] = useState<{ to: string; cc: string; bcc: string; subject: string } | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [gmailSyncMessage, setGmailSyncMessage] = useState<string | null>(null);
  const [inboxSearch, setInboxSearch] = useState('');
  const seenInboundIds = useRef<Set<string> | null>(null);
  const [, startReadTransition] = useTransition();
  const router = useRouter();

  // Only show real records stored in Supabase. Never inject demo/sample messages into the live inbox.
  const inbox = emails.filter((e) => e.direction === 'inbound');
  const sent = emails.filter((e) => e.status === 'Sent' && e.direction !== 'inbound');
  const drafts = emails.filter((e) => e.status === 'Draft');
  const scheduled = emails.filter((e) => e.status === 'Scheduled');

  const unreadCount = inbox.filter((e) => !e.read && !locallyRead.has(e.id)).length;

  // Refresh the server-rendered email records every 30 seconds while this panel is open.
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [router]);

  // Keep the open inbox synchronized with Gmail while the user is viewing this panel.
  // The server deduplicates message IDs, so repeated checks do not duplicate rows.
  useEffect(() => {
    let stopped = false;
    const runSync = async () => {
      try {
        const response = await fetch('/api/auth/gmail/sync', { method: 'POST', cache: 'no-store' });
        if (stopped || !response.ok) return;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const result = await response.json() as { imported?: number };
        if (!stopped && (result.imported || 0) > 0) router.refresh();
      } catch { /* Background sync is best-effort; manual Sync Gmail shows errors. */ }
    };
    const timer = window.setInterval(() => { void runSync(); }, 90_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [router]);

  // Alert only for newly observed real inbound IDs. Sound is opt-in because browsers
  // require a user gesture before playing audio.
  useEffect(() => {
    const currentIds = new Set(inbox.map((email) => email.id));
    if (seenInboundIds.current === null) {
      seenInboundIds.current = currentIds;
      return;
    }
    const hasNewMail = [...currentIds].some((id) => !seenInboundIds.current!.has(id));
    seenInboundIds.current = currentIds;
    if (hasNewMail && soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = 880;
          gain.gain.value = 0.08;
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.18);
          oscillator.onended = () => void context.close();
        }
        if ('Notification' in window && Notification.permission === 'granted') new Notification('New email received', { body: 'A new email has arrived in JAAD ERP.' });
      } catch { /* Notification/audio permissions can be blocked by the browser. */ }
    }
  }, [emails, soundEnabled]);

  async function refreshEmails() {
    setIsRefreshing(true);
    try { router.refresh(); } finally { window.setTimeout(() => setIsRefreshing(false), 700); }
  }

  async function syncGmail() {
    setIsSyncingGmail(true);
    setGmailSyncMessage(null);
    try {
      const response = await fetch('/api/auth/gmail/sync', { method: 'POST', cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Gmail sync returned an HTML page instead of JSON. The Gmail sync route is missing or in the wrong app folder. Copy app/api/auth/gmail/sync/route.ts into the same app root as your Support page, then restart npm run dev.');
      }
      const result = await response.json() as { ok?: boolean; account?: string; imported?: number; skipped?: number; checked?: number; error?: string; connect?: boolean };
      if (response.status === 409 && result.connect) {
        window.location.href = '/api/auth/gmail';
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.error || 'Gmail synchronization failed.');
      setGmailSyncMessage(`Synced ${result.account ? 'Gmail' : 'mailbox'}: ${result.imported || 0} new, ${result.skipped || 0} already imported.`);
      setTab('inbox');
      setInboxCategory('Primary');
      router.refresh();
    } catch (error) {
      setGmailSyncMessage(error instanceof Error ? error.message : 'Gmail synchronization failed.');
    } finally {
      setIsSyncingGmail(false);
    }
  }

  async function enableEmailAlerts() {
    setSoundEnabled((enabled) => !enabled);
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* Browser permission unavailable. */ }
    }
  }

  function openEmail(e: Email) {
    setSelectedEmail(e);
    if (e.direction === 'inbound' && !e.id.startsWith('demo-') && !e.read && !locallyRead.has(e.id)) {
      setLocallyRead((prev) => new Set(prev).add(e.id));
      startReadTransition(async () => {
        await markEmailRead(e.id);
        router.refresh();
      });
    }
  }

  // Compose form state
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply a prefilled body (from Reply/Forward) once the compose editor is mounted.
  useEffect(() => {
    if (tab === 'compose' && pendingBody !== null && bodyRef.current) {
      bodyRef.current.innerHTML = pendingBody;
      setPendingBody(null);
    }
  }, [tab, pendingBody]);

  function exec(command: string, value?: string) {
    bodyRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function insertLink() {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const maxFileBytes = 20 * 1024 * 1024;
    const maxTotalBytes = 25 * 1024 * 1024;
    const tooLarge = incoming.find((file) => file.size > maxFileBytes);
    if (tooLarge) {
      setError(`\"${tooLarge.name}\" is larger than 20 MB. Choose a smaller file.`);
      return;
    }
    const totalBytes = [...files, ...incoming].reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > maxTotalBytes) {
      setError('Attachments cannot exceed 25 MB in total. Remove a file or choose smaller files.');
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...incoming]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setTo('');
    setCc('');
    setBcc('');
    setShowCc(false);
    setShowBcc(false);
    setSubject('');
    setFiles([]);
    setShowSchedule(false);
    setScheduledAt('');
    if (bodyRef.current) bodyRef.current.innerHTML = '';
  }

  function quoteBlock(email: Email, label: string) {
    return `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;color:#666;margin-top:8px">${label}<br>${email.body || ''}</div>`;
  }

  function handleReply(email: Email) {
    setSelectedEmail(null);
    setTo(email.from_address || email.to_address);
    setCc('');
    setBcc('');
    setShowCc(false);
    setShowBcc(false);
    setSubject(email.subject?.toLowerCase().startsWith('re:') ? email.subject : `Re: ${email.subject || ''}`);
    setFiles([]);
    setPendingBody(quoteBlock(email, `On ${new Date(email.created_at).toLocaleString()}, ${email.from_address || email.to_address} wrote:`));
    setTab('compose');
  }

  function handleForward(email: Email) {
    setSelectedEmail(null);
    setTo('');
    setCc('');
    setBcc('');
    setShowCc(false);
    setShowBcc(false);
    setSubject(email.subject?.toLowerCase().startsWith('fwd:') ? email.subject : `Fwd: ${email.subject || ''}`);
    setFiles([]);
    setPendingBody(
      quoteBlock(email, `---------- Forwarded message ----------<br>From: ${email.from_address || email.to_address}<br>Date: ${new Date(email.created_at).toLocaleString()}<br>Subject: ${email.subject || ''}`)
    );
    setTab('compose');
  }

  function submit(saveAsDraft: boolean, schedule = false) {
    if (!to.trim() && !saveAsDraft) {
      setError('Recipient is required.');
      return;
    }
    if (schedule && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
      setError('Choose a future date and time for scheduled delivery.');
      return;
    }
    const fd = new FormData();
    fd.set('to_address', to.trim());
    fd.set('cc', cc.trim());
    fd.set('bcc', bcc.trim());
    fd.set('subject', subject.trim());
    fd.set('body', bodyRef.current?.innerHTML ?? '');
    fd.set('save_as_draft', saveAsDraft ? 'true' : 'false');
    fd.set('scheduled_at', schedule ? new Date(scheduledAt).toISOString() : '');
    files.forEach((f) => fd.append('attachments', f));

    setError(null);
    startTransition(async () => {
      const res = await sendSupportEmail(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (!saveAsDraft && !schedule) {
        setSentPopup({ to: to.trim(), cc: cc.trim(), bcc: bcc.trim(), subject: subject.trim() });
      }
      resetForm();
      setTab(saveAsDraft ? 'drafts' : schedule ? 'scheduled' : 'sent');
      router.refresh();
    });
  }

  function EmailListTable({ rows, columnLabel }: { rows: Email[]; columnLabel: string }) {
    return (
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[minmax(140px,220px)_minmax(0,1fr)_96px] gap-3 bg-neutral-50 px-4 py-2 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            <div>{columnLabel}</div>
            <div>Subject</div>
            <div className="text-right">Date</div>
          </div>
          {rows.map((e) => (
            <button
              key={e.id}
              onClick={() => openEmail(e)}
              className="grid w-full grid-cols-[minmax(140px,220px)_minmax(0,1fr)_96px] gap-3 border-t border-neutral-100 px-4 py-2 text-left text-[13px] leading-5 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
            >
              <div className={`truncate ${!e.read && e.direction === 'inbound' ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 dark:text-neutral-300'}`}>{e.direction === 'inbound' ? (e.from_address || e.to_address) : e.to_address}</div>
              <div className={`flex min-w-0 items-center gap-2 truncate ${!e.read && e.direction === 'inbound' ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-800 dark:text-neutral-200'}`}><span className="truncate">{e.subject || '(no subject)'}</span>{Array.isArray(e.attachments) && e.attachments.length > 0 && <span title={`${e.attachments.length} attachment(s)`} className="shrink-0 text-neutral-400">📎</span>}</div>
              <div className="text-right text-xs text-neutral-400">{new Date(e.status === 'Scheduled' && e.scheduled_at ? e.scheduled_at : e.created_at).toLocaleDateString()}</div>
            </button>
          ))}
          {rows.length === 0 && (
            <div className="px-5 py-8 text-center text-neutral-400">No emails.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onReply={handleReply}
          onForward={handleForward}
        />
      )}

      {sentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setSentPopup(null)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2 text-green-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" />
              </svg>
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Email sent</span>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-400">To</dt><dd className="text-neutral-800 dark:text-neutral-200">{sentPopup.to}</dd></div>
              {sentPopup.cc && <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-400">Cc</dt><dd className="text-neutral-800 dark:text-neutral-200">{sentPopup.cc}</dd></div>}
              {sentPopup.bcc && <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-400">Bcc</dt><dd className="text-neutral-800 dark:text-neutral-200">{sentPopup.bcc}</dd></div>}
              <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-400">Subject</dt><dd className="text-neutral-800 dark:text-neutral-200">{sentPopup.subject || '(no subject)'}</dd></div>
            </dl>
            <button
              onClick={() => setSentPopup(null)}
              className="mt-5 w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
        {(['compose', 'inbox', 'sent', 'drafts', 'scheduled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'compose') { setComposeMinimized(false); setComposeMaximized(false); } }}
            className={`relative rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? 'bg-red-600 text-white' : 'border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            {t}
            {t === 'inbox' && unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-neutral-950">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={syncGmail} disabled={isSyncingGmail} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300" title="Connect Gmail or synchronize new inbox messages">{isSyncingGmail ? 'Syncing Gmail…' : '↻ Sync Gmail'}</button>
          <button type="button" onClick={refreshEmails} disabled={isRefreshing} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200" title="Refresh email list">↻ {isRefreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" onClick={enableEmailAlerts} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-sm ${soundEnabled ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'}`} title="Enable or disable new-email sound">{soundEnabled ? '🔔 Sound on' : '🔕 Sound off'}</button>
        </div>
      </div>

      {tab === 'compose' && (
        <>
          <div
            className="fixed z-50 flex flex-col overflow-hidden rounded-t-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            style={composeMaximized
              ? { top: 16, right: 16, bottom: 16, left: 16, width: 'auto', height: 'auto' }
              : composeMinimized
                ? { right: 24, bottom: 20, width: 'min(320px, calc(100vw - 32px))', height: 48 }
                : { right: 24, bottom: 20, width: 'min(420px, calc(100vw - 32px))', height: 'min(560px, calc(100dvh - 96px))' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-100 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">New message</div>
                {!composeMinimized && <div className="text-xs text-neutral-500">Compose email</div>}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setComposeMinimized((v) => !v); setComposeMaximized(false); }} aria-label={composeMinimized ? 'Restore compose window' : 'Minimize compose window'} title={composeMinimized ? 'Restore' : 'Minimize'} className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800">{composeMinimized ? '□' : '−'}</button>
                <button type="button" onClick={() => { setComposeMaximized((v) => !v); setComposeMinimized(false); }} aria-label={composeMaximized ? 'Restore compose window' : 'Maximize compose window'} title={composeMaximized ? 'Restore' : 'Maximize'} className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800">{composeMaximized ? '❐' : '□'}</button>
                <button type="button" onClick={() => { setTab('inbox'); setComposeMinimized(false); setComposeMaximized(false); }} aria-label="Close compose window" title="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"><ToolbarIcon name="close" /></button>
              </div>
            </div>
            <div className={composeMinimized ? 'hidden' : 'min-h-0 flex-1 overflow-y-auto'}>
        <div className="flex min-h-full flex-col overflow-hidden bg-white dark:bg-neutral-900">
          {error && (
            <p className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-2 dark:border-neutral-800">
            <label className="w-12 shrink-0 text-xs font-medium text-neutral-500">To</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              type="email"
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-100"
            />
            <div className="flex gap-2 text-xs text-neutral-400">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="hover:text-neutral-600 dark:hover:text-neutral-300">Cc</button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="hover:text-neutral-600 dark:hover:text-neutral-300">Bcc</button>
              )}
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-2 dark:border-neutral-800">
              <label className="w-12 shrink-0 text-xs font-medium text-neutral-500">Cc</label>
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com, another@example.com"
                className="flex-1 bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-100"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-2 dark:border-neutral-800">
              <label className="w-12 shrink-0 text-xs font-medium text-neutral-500">Bcc</label>
              <input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1 bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-100"
              />
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-2 dark:border-neutral-800">
            <label className="w-12 shrink-0 text-xs font-medium text-neutral-500">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 bg-transparent text-sm text-neutral-900 outline-none dark:text-neutral-100"
            />
          </div>

          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your message..."
            className={`email-body min-h-[140px] flex-1 px-5 py-3 text-sm leading-6 text-neutral-900 outline-none empty:before:text-neutral-400 empty:before:content-[attr(data-placeholder)] dark:text-neutral-100 ${composeMaximized ? 'min-h-[calc(92vh-230px)]' : ''}`}
          />
          <style>{`
            .email-body ul { list-style: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
            .email-body ol { list-style: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
            .email-body a { color: #dc2626; text-decoration: underline; }
          `}</style>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                >
                  <ToolbarIcon name="attach" /> {f.name}
                  <button onClick={() => removeFile(i)} className="text-neutral-400 hover:text-red-600">✕</button>
                </span>
              ))}
            </div>
          )}

          {showSchedule && (
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <label htmlFor="schedule-email-at" className="text-xs text-neutral-500">Schedule for</label>
              <input id="schedule-email-at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" />
              <button type="button" disabled={isPending} onClick={() => submit(false, true)} className="h-8 shrink-0 whitespace-nowrap rounded-md bg-red-600 px-3 text-xs font-medium text-white disabled:opacity-50">Schedule send</button>
            </div>
          )}

          <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              <button onClick={() => exec('bold')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Bold"><ToolbarIcon name="bold" /></button>
              <button onClick={() => exec('italic')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Italic"><ToolbarIcon name="italic" /></button>
              <button onClick={() => exec('underline')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Underline"><ToolbarIcon name="underline" /></button>
              <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button onClick={() => exec('insertUnorderedList')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Bullet list"><ToolbarIcon name="bullets" /></button>
              <button onClick={() => exec('insertOrderedList')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Numbered list"><ToolbarIcon name="numbers" /></button>
              <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button onClick={insertLink} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Insert link"><ToolbarIcon name="link" /></button>
              <button onClick={() => fileInputRef.current?.click()} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" title="Attach file"><ToolbarIcon name="attach" /></button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                aria-label="Choose email attachments"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1 pr-1">
              <button type="button" disabled={isPending} onClick={() => setShowSchedule((v) => !v)} title="Schedule email" className="h-8 shrink-0 whitespace-nowrap rounded-md border border-neutral-300 px-2 text-[11px] font-medium leading-none text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Schedule</button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submit(true)}
                className="h-8 shrink-0 whitespace-nowrap rounded-md border border-neutral-300 px-2.5 text-[11px] font-medium leading-none text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submit(false)}
                className="h-8 shrink-0 whitespace-nowrap rounded-md bg-red-600 px-3 text-xs font-medium leading-none text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
            </div>
          </div>
        </>
      )}

      {tab === 'inbox' && (
        <div className="space-y-0">
          {gmailSyncMessage && <div role="status" className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{gmailSyncMessage}</div>}
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <input aria-label="Search inbox" value={inboxSearch} onChange={(e) => setInboxSearch(e.target.value)} placeholder="Search sender, company, email address, subject or message…" className="h-9 min-w-[220px] flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 outline-none focus:border-red-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100" />
            <button type="button" onClick={() => setInboxSearch('')} className="h-9 rounded-lg border border-neutral-200 px-3 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Clear</button>
          </div>
          <div role="tablist" aria-label="Inbox categories" className="mb-0 grid grid-cols-2 border-b border-neutral-200 bg-white sm:grid-cols-5 dark:border-neutral-800 dark:bg-neutral-900">
            {(['Primary', 'Promotions', 'Social', 'Updates', 'Forums'] as const).map((category) => {
              const count = inbox.filter((email) => getInboxCategory(email) === category && !email.read && !locallyRead.has(email.id)).length;
              const active = inboxCategory === category;
              return (
                <button
                  key={category}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setInboxCategory(category)}
                  className={`flex min-h-12 items-center justify-center gap-2 border-b-[3px] px-3 py-3 text-xs font-semibold transition-colors ${active ? 'border-red-600 text-red-600' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 dark:hover:bg-neutral-800'}`}
                >
                  {category}
                  {count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>{count}</span>}
                </button>
              );
            })}
          </div>
          <EmailListTable rows={inbox.filter((email) => getInboxCategory(email) === inboxCategory).filter((email) => `${email.from_address || ''} ${email.to_address || ''} ${email.subject || ''} ${email.body || ''}`.toLowerCase().includes(inboxSearch.trim().toLowerCase()))} columnLabel="From" />
        </div>
      )}
      {tab === 'sent' && <EmailListTable rows={sent} columnLabel="To" />}
      {tab === 'drafts' && <EmailListTable rows={drafts} columnLabel="To" />}
      {tab === 'scheduled' && <EmailListTable rows={scheduled} columnLabel="To" />}
    </div>
  );
}
