'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSupportEmail, markEmailRead } from './actions';

type Email = { id: string; to_address: string; subject: string; body: string; status: string; direction?: string; read?: boolean; created_at: string };

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
            <span className="text-neutral-800 dark:text-neutral-200">{email.to_address}</span>
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
            className="email-body text-sm text-neutral-800 dark:text-neutral-200"
            dangerouslySetInnerHTML={{ __html: email.body || '<p class="text-neutral-400">(empty)</p>' }}
          />
          <style>{`
            .email-body ul { list-style: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
            .email-body ol { list-style: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
            .email-body a { color: #dc2626; text-decoration: underline; }
          `}</style>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 dark:border-neutral-800">
          <span className="text-xs text-neutral-400">No attachments captured for this email.</span>
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
  const [tab, setTab] = useState<'compose' | 'inbox' | 'sent' | 'drafts'>('compose');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentPopup, setSentPopup] = useState<{ to: string; cc: string; bcc: string; subject: string } | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const [, startReadTransition] = useTransition();
  const router = useRouter();

  const inbox = emails.filter((e) => e.direction === 'inbound');
  const sent = emails.filter((e) => e.status === 'Sent' && e.direction !== 'inbound');
  const drafts = emails.filter((e) => e.status === 'Draft');

  const unreadCount = inbox.filter((e) => !e.read && !locallyRead.has(e.id)).length;

  function openEmail(e: Email) {
    setSelectedEmail(e);
    if (e.direction === 'inbound' && !e.read && !locallyRead.has(e.id)) {
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
    setFiles((prev) => [...prev, ...Array.from(list)]);
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
    if (bodyRef.current) bodyRef.current.innerHTML = '';
  }

  function quoteBlock(email: Email, label: string) {
    return `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;color:#666;margin-top:8px">${label}<br>${email.body || ''}</div>`;
  }

  function handleReply(email: Email) {
    setSelectedEmail(null);
    setTo(email.to_address);
    setCc('');
    setBcc('');
    setShowCc(false);
    setShowBcc(false);
    setSubject(email.subject?.toLowerCase().startsWith('re:') ? email.subject : `Re: ${email.subject || ''}`);
    setFiles([]);
    setPendingBody(quoteBlock(email, `On ${new Date(email.created_at).toLocaleString()}, ${email.to_address} wrote:`));
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
      quoteBlock(email, `---------- Forwarded message ----------<br>From: ${email.to_address}<br>Date: ${new Date(email.created_at).toLocaleString()}<br>Subject: ${email.subject || ''}`)
    );
    setTab('compose');
  }

  function submit(saveAsDraft: boolean) {
    if (!to.trim() && !saveAsDraft) {
      setError('Recipient is required.');
      return;
    }
    const fd = new FormData();
    fd.set('to_address', to.trim());
    fd.set('cc', cc.trim());
    fd.set('bcc', bcc.trim());
    fd.set('subject', subject.trim());
    fd.set('body', bodyRef.current?.innerHTML ?? '');
    fd.set('save_as_draft', saveAsDraft ? 'true' : 'false');
    files.forEach((f) => fd.append('attachments', f));

    setError(null);
    startTransition(async () => {
      const res = await sendSupportEmail(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (!saveAsDraft) {
        setSentPopup({ to: to.trim(), cc: cc.trim(), bcc: bcc.trim(), subject: subject.trim() });
      }
      resetForm();
      setTab(saveAsDraft ? 'drafts' : 'sent');
      router.refresh();
    });
  }

  function EmailListTable({ rows, columnLabel }: { rows: Email[]; columnLabel: string }) {
    return (
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[300px_1fr_140px] gap-6 bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            <div>{columnLabel}</div>
            <div>Subject</div>
            <div className="text-right">Date</div>
          </div>
          {rows.map((e) => (
            <button
              key={e.id}
              onClick={() => openEmail(e)}
              className="grid w-full grid-cols-[300px_1fr_140px] gap-6 border-t border-neutral-100 px-5 py-3 text-left text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
            >
              <div className="truncate text-neutral-700 dark:text-neutral-300">{e.to_address}</div>
              <div className="truncate text-neutral-900 dark:text-neutral-100">{e.subject || '(no subject)'}</div>
              <div className="text-right text-xs text-neutral-400">{new Date(e.created_at).toLocaleDateString()}</div>
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

      <div className="mb-4 flex gap-2">
        {(['compose', 'inbox', 'sent', 'drafts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
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

      {tab === 'compose' && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
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
            className="email-body min-h-[220px] px-5 py-4 text-sm text-neutral-900 outline-none empty:before:text-neutral-400 empty:before:content-[attr(data-placeholder)] dark:text-neutral-100"
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

          <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <div className="flex items-center gap-1">
              <button onClick={() => exec('bold')} className={TOOLBAR_BTN} title="Bold"><ToolbarIcon name="bold" /></button>
              <button onClick={() => exec('italic')} className={TOOLBAR_BTN} title="Italic"><ToolbarIcon name="italic" /></button>
              <button onClick={() => exec('underline')} className={TOOLBAR_BTN} title="Underline"><ToolbarIcon name="underline" /></button>
              <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button onClick={() => exec('insertUnorderedList')} className={TOOLBAR_BTN} title="Bullet list"><ToolbarIcon name="bullets" /></button>
              <button onClick={() => exec('insertOrderedList')} className={TOOLBAR_BTN} title="Numbered list"><ToolbarIcon name="numbers" /></button>
              <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button onClick={insertLink} className={TOOLBAR_BTN} title="Insert link"><ToolbarIcon name="link" /></button>
              <button onClick={() => fileInputRef.current?.click()} className={TOOLBAR_BTN} title="Attach file"><ToolbarIcon name="attach" /></button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="flex gap-2 pr-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => submit(true)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submit(false)}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'inbox' && <EmailListTable rows={inbox} columnLabel="From" />}
      {tab === 'sent' && <EmailListTable rows={sent} columnLabel="To" />}
      {tab === 'drafts' && <EmailListTable rows={drafts} columnLabel="To" />}
    </div>
  );
}
