'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendSupportSms } from './actions';

type Sms = {
  id: string;
  to_number: string;
  from_number?: string;
  message: string;
  status: string;
  created_at: string;
};

type SmsDraft = { id: string; to_number: string; message: string; updated_at: string };
type SmsContact = { id: string; name: string; phone: string };
type SmsTab = 'compose' | 'inbox' | 'sent' | 'drafts';

const DRAFTS_KEY = 'jaad-support-sms-drafts-v1';
const SEEN_SMS_KEY = 'jaad-support-sms-seen-v1';
const fieldClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
    active
      ? 'bg-red-600 text-white'
      : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`;

export default function SmsPanel({
  history,
  inbox = [],
  contacts = [],
}: {
  history: Sms[];
  /** Populate this with inbound SMS rows fetched by the server page. */
  inbox?: Sms[];
  /** CRM/Leads contacts with a usable phone number. */
  contacts?: SmsContact[];
}) {
  const [tab, setTab] = useState<SmsTab>('compose');
  const [isMinimized, setIsMinimized] = useState(false);
  const [toNumber, setToNumber] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<SmsDraft[]>([]);
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const previousInboxIds = useRef<string[] | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFTS_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setDrafts(parsed as SmsDraft[]);
      }
    } catch {
      // Ignore invalid or unavailable local draft storage.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
      // Draft saving remains best-effort if browser storage is disabled.
    }
  }, [drafts]);

  // Poll the server so newly received SMS can appear without manually refreshing.
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [router]);

  // Track newly arriving inbox rows. Existing messages on the first load are not
  // announced as new; only IDs added after the panel has loaded trigger alerts.
  useEffect(() => {
    const currentIds = inbox.map((sms) => sms.id);
    if (previousInboxIds.current === null) {
      previousInboxIds.current = currentIds;
      try {
        const saved = window.localStorage.getItem(SEEN_SMS_KEY);
        if (saved === null) {
          window.localStorage.setItem(SEEN_SMS_KEY, JSON.stringify(currentIds));
        } else {
          const seen = new Set<string>(JSON.parse(saved));
          setUnreadIds(currentIds.filter((id) => !seen.has(id)));
        }
      } catch {
        // Continue without persisted notification state if storage is unavailable.
      }
      return;
    }

    const previous = new Set(previousInboxIds.current);
    const newlyArrived = currentIds.filter((id) => !previous.has(id));
    previousInboxIds.current = currentIds;
    if (!newlyArrived.length) return;

    setUnreadIds((current) => Array.from(new Set([...current, ...newlyArrived])));
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newlyArrived.length === 1 ? 'New SMS received' : `${newlyArrived.length} new SMS messages`, {
          body: 'Open JAAD ERP Support → SMS → Inbox to read and reply.',
          tag: 'jaad-support-new-sms',
        });
      }
    } catch {
      // In-app badge remains available even if browser notifications are blocked.
    }
  }, [inbox]);

  function openInbox() {
    setTab('inbox');
    const ids = inbox.map((sms) => sms.id);
    setUnreadIds([]);
    try {
      window.localStorage.setItem(SEEN_SMS_KEY, JSON.stringify(ids));
    } catch {
      // Reading the inbox still works without local storage.
    }
  }

  async function enableBrowserNotifications() {
    if (!('Notification' in window)) {
      setError('This browser does not support desktop notifications. The Inbox badge will still show new SMS.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') setError('Desktop notifications are not enabled. The Inbox badge will still show new SMS.');
      else setError(null);
    } catch {
      setError('Could not enable desktop notifications. The Inbox badge will still show new SMS.');
    }
  }

  function saveDraft() {
    const existing = activeDraftId ? drafts.find((draft) => draft.id === activeDraftId) : undefined;
    const draft: SmsDraft = {
      id: existing?.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`),
      to_number: toNumber.trim(),
      message: message.trim(),
      updated_at: new Date().toISOString(),
    };
    setDrafts((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
    setActiveDraftId(draft.id);
    setError(null);
    setTab('drafts');
  }

  function openDraft(draft: SmsDraft) {
    setActiveDraftId(draft.id);
    setToNumber(draft.to_number);
    setMessage(draft.message);
    setError(null);
    setTab('compose');
  }

  const tabs: SmsTab[] = ['compose', 'inbox', 'sent', 'drafts'];

  function replyToSms(sms: Sms) {
    const number = (sms.from_number || '').trim();
    if (!number) {
      setError('The sender phone number is not available for this message.');
      return;
    }
    setToNumber(number);
    setMessage('');
    setActiveDraftId(null);
    setError(null);
    setTab('compose');
    setIsMinimized(false);
  }


  return (
    <div
      className={isMinimized
        ? "fixed z-[100] space-y-3 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 shadow-2xl dark:border-neutral-700 dark:bg-neutral-950"
        : "w-full space-y-3"}
      style={isMinimized ? {
        width: 'min(1120px, calc(100vw - 230px))',
        height: 'min(760px, 76vh)',
        minHeight: '420px',
        maxHeight: '76vh',
        position: 'fixed',
        left: 'calc(198px + (100vw - 198px) / 2)',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2147483000,
      } : undefined}
    >
      <div className="flex min-h-10 items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">SMS Support</h2>
          <p className="text-[11px] text-neutral-500">Compose, receive and manage SMS messages</p>
        </div>
        <button type="button" onClick={() => setIsMinimized((value) => !value)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800" aria-label={isMinimized ? 'Restore SMS panel' : 'Minimize SMS panel'} title={isMinimized ? 'Restore SMS panel' : 'Minimize SMS panel'}><span aria-hidden="true">{isMinimized ? '↙' : '−'}</span>{isMinimized ? 'Restore' : 'Minimize'}</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Sent SMS</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800 dark:text-emerald-200">{history.length}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 shadow-sm dark:border-sky-900 dark:bg-sky-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">SMS received</p>
          <p className="mt-1 text-2xl font-semibold text-sky-800 dark:text-sky-200">{inbox.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Total SMS</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800 dark:text-amber-200">{history.length + inbox.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="SMS folders">
        {tabs.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => item === 'inbox' ? openInbox() : setTab(item)} className={`${tabClass(tab === item)} relative`}>
            {item === 'inbox' ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">✉</span> Inbox
                {unreadIds.length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" aria-label={`${unreadIds.length} new SMS`}>{unreadIds.length}</span>}
                {unreadIds.length > 0 && <span className="sr-only">{unreadIds.length} new SMS</span>}
              </span>
            ) : item === 'sent' ? `Sent (${history.length})` : item === 'drafts' ? `Drafts (${drafts.length})` : 'Compose'}
          </button>
        ))}
        <button type="button" onClick={enableBrowserNotifications} title="Enable desktop notifications for new SMS" className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">🔔 Notifications</button>
      </div>

      {tab === 'compose' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Send SMS</h3>
          <p className="mb-4 text-xs text-neutral-400">Choose a CRM/Leads contact or enter any phone number manually.</p>
          {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          <form
            ref={formRef}
            action={(fd) => {
              setError(null);
              fd.set('to_number', toNumber);
              fd.set('message', message);
              startTransition(async () => {
                const res = await sendSupportSms(fd);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                formRef.current?.reset();
                setToNumber('');
                setMessage('');
                setActiveDraftId(null);
                setDrafts((current) => current.filter((draft) => draft.id !== activeDraftId));
                setTab('sent');
                router.refresh();
              });
            }}
            className="space-y-3"
          >
            {contacts.length > 0 && (
              <div>
                <label htmlFor="sms-contact" className="mb-1 block text-xs font-medium uppercase text-neutral-500">Choose CRM / Leads contact (optional)</label>
                <select
                  id="sms-contact"
                  value=""
                  onChange={(event) => {
                    const selected = contacts.find((contact) => contact.id === event.target.value);
                    if (selected) setToNumber(selected.phone);
                  }}
                  className={fieldClass}
                >
                  <option value="">Select a contact to fill their phone number…</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>{contact.name} — {contact.phone}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-400">You can still edit the number below or type a number not saved in CRM.</p>
              </div>
            )}
            <div>
              <label htmlFor="sms-to-number" className="mb-1 block text-xs font-medium uppercase text-neutral-500">To phone number</label>
              <input id="sms-to-number" name="to_number" type="tel" autoComplete="tel" value={toNumber} onChange={(event) => setToNumber(event.target.value)} required placeholder="+2348012345678" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="sms-message" className="mb-1 block text-xs font-medium uppercase text-neutral-500">Message</label>
              <textarea id="sms-message" name="message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={320} rows={5} required placeholder="Type SMS" className={fieldClass} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-700">{message.length} / 320</span>
              <button type="button" onClick={saveDraft} disabled={!toNumber.trim() && !message.trim()} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Save draft</button>
              <button type="submit" disabled={isPending || !toNumber.trim() || !message.trim()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{isPending ? 'Sending...' : 'Send SMS'}</button>
            </div>
          </form>
        </div>
      )}

      {(tab === 'inbox' || tab === 'sent') && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-[150px_minmax(0,1fr)_120px] gap-3 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400 sm:grid-cols-[190px_minmax(0,1fr)_150px]">
            <div>{tab === 'inbox' ? 'From' : 'To'}</div><div>Message</div><div className="text-right">Date</div>
          </div>
          {(tab === 'inbox' ? inbox : history).map((sms) => (
            <div key={sms.id} className="grid grid-cols-[150px_minmax(0,1fr)_120px] gap-3 border-t border-neutral-100 px-4 py-3 text-sm dark:border-neutral-800 sm:grid-cols-[190px_minmax(0,1fr)_150px]">
              <div className="truncate text-neutral-700 dark:text-neutral-300">{tab === 'inbox' ? (sms.from_number || sms.to_number) : sms.to_number}</div>
              <div className="whitespace-pre-wrap break-words text-neutral-900 dark:text-neutral-100">{sms.message}</div>
              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-xs text-neutral-400">{sms.created_at ? new Date(sms.created_at).toLocaleString() : '—'}</span>
                {tab === 'inbox' && (
                  <button type="button" onClick={() => replyToSms(sms)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30">Reply</button>
                )}
              </div>
            </div>
          ))}
          {((tab === 'inbox' && !inbox.length) || (tab === 'sent' && !history.length)) && (
            <div className="px-5 py-10 text-center text-sm text-neutral-400">{tab === 'inbox' ? 'No SMS received yet.' : 'No SMS sent yet.'}</div>
          )}
          {tab === 'inbox' && <p className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-400 dark:border-neutral-800">Incoming messages appear here once your SMS provider webhook is connected and inbound SMS records are passed to this panel.</p>}
        </div>
      )}

      {tab === 'drafts' && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {drafts.map((draft) => (
            <div key={draft.id} className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center dark:border-neutral-800">
              <button type="button" onClick={() => openDraft(draft)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{draft.to_number || 'No recipient yet'}</p>
                <p className="truncate text-sm text-neutral-500">{draft.message || '(No message text)'}</p>
                <p className="mt-1 text-xs text-neutral-400">Saved {new Date(draft.updated_at).toLocaleString()}</p>
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => openDraft(draft)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700">Edit</button>
                <button type="button" onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 dark:border-red-900">Delete</button>
              </div>
            </div>
          ))}
          {!drafts.length && <div className="px-5 py-10 text-center text-sm text-neutral-400">No SMS drafts yet.</div>}
        </div>
      )}
    </div>
  );
}
