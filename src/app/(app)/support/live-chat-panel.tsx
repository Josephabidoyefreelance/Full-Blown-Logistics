'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateLiveChatStatus, sendLiveChatMessage, uploadLiveChatFile } from './actions';
import MessageContent from './message-content';

type Chat = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  status: string;
  created_at?: string | null;
};
type Message = { id: string; chat_id: string; sender: string; message: string; created_at: string };
type ChatStatus = 'Open' | 'Pending' | 'Resolved';
type WindowMode = 'normal' | 'minimized';

const STATUS_COLORS: Record<string, string> = {
  Open: '#dc2626',
  Pending: '#ca8a04',
  Resolved: '#1f9d5c',
};

function stamp(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LiveChatPanel({ chats, messages }: { chats: Chat[]; messages: Message[] }) {
  const [filter, setFilter] = useState<ChatStatus>('Open');
  const [selectedId, setSelectedId] = useState<string | null>(() => chats.find((c) => c.status === 'Open')?.id ?? chats[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [windowMode, setWindowMode] = useState<WindowMode>('normal');
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!selectedId && chats.length) {
      const first = chats.find((c) => c.status === filter) ?? chats[0];
      if (first) setSelectedId(first.id);
    }
  }, [chats, filter, selectedId]);

  useEffect(() => {
    const channel = supabase
      .channel('agent-live-chat-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chats' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat_messages' }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, router]);

  const counts: Record<ChatStatus, number> = {
    Open: chats.filter((c) => c.status === 'Open').length,
    Pending: chats.filter((c) => c.status === 'Pending').length,
    Resolved: chats.filter((c) => c.status === 'Resolved').length,
  };

  const filtered = chats
    .filter((c) => c.status === filter)
    .filter((c) => `${c.customer_name} ${c.customer_email ?? ''} ${c.customer_phone ?? ''}`.toLowerCase().includes(search.toLowerCase().trim()));
  const selected = chats.find((c) => c.id === selectedId) ?? null;
  const thread = messages.filter((m) => m.chat_id === selectedId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function send() {
    if (!draft.trim() || !selected || isPending) return;
    const message = draft.trim();
    setError(null);
    startTransition(async () => {
      const res = await sendLiveChatMessage(selected.id, message);
      if (res?.error) { setError(res.error); return; }
      setDraft('');
      router.refresh();
    });
  }

  function moveTo(status: ChatStatus) {
    if (!selected || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await updateLiveChatStatus(selected.id, status);
      if (res?.error) { setError(res.error); return; }
      setFilter(status);
      setSelectedId(selected.id); // Keep the conversation/history available to staff after resolving.
      router.refresh();
    });
  }

  function downloadTranscript() {
    if (!selected) return;
    const lines = [
      'JAAD LOGISTICS — LIVE CHAT TRANSCRIPT',
      `Customer: ${selected.customer_name || 'Website visitor'}`,
      `Email: ${selected.customer_email || 'Not provided'}`,
      `Phone: ${selected.customer_phone || 'Not provided'}`,
      `Conversation ID: ${selected.id}`,
      `Current status: ${selected.status}`,
      `Conversation started: ${stamp(selected.created_at)}`,
      `Exported: ${new Date().toLocaleString()}`,
      '',
      'MESSAGES',
      ...thread.map((m) => `[${stamp(m.created_at)}] ${m.sender === 'agent' ? 'JAAD Support' : selected.customer_name}: ${m.message}`),
      '',
      'End of transcript.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JAAD-chat-${(selected.customer_name || 'customer').replace(/[^a-z0-9-_]+/gi, '-')}-${selected.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Keep the chat as a fixed-header/fixed-composer flex column. Minimize toggles
  // to a centered floating window; it never expands past the viewport or shifts sideways.
  const isFloating = windowMode === 'minimized';
  const frameClass = isFloating
    ? 'z-[100] flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950'
    : 'relative flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';

  const panel = (
    <div
      className={frameClass}
      style={isFloating ? { position: 'fixed', left: '50%', top: '50%', width: 'min(1400px, calc(100vw - 32px))', height: 'min(760px, calc(100dvh - 32px))', maxWidth: 'calc(100vw - 32px)', transform: 'translate(-50%, -50%)', zIndex: 100 } : undefined}
    >
      <aside className="flex min-h-0 w-[28%] min-w-[280px] max-w-[380px] shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-neutral-200 p-2.5 dark:border-neutral-800">
          {(['Open', 'Pending', 'Resolved'] as const).map((s) => (
            <button key={s} type="button" onClick={() => {
              setFilter(s);
              if (!chats.some((c) => c.id === selectedId && c.status === s)) setSelectedId(chats.find((c) => c.status === s)?.id ?? null);
            }}
              className={`min-w-0 rounded-lg px-1.5 py-2.5 text-center text-xs font-semibold transition-colors ${filter === s ? 'bg-red-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'}`}>
              <span>{s} ({counts[s]})</span>
            </button>
          ))}
        </div>

        <div className="shrink-0 border-b border-neutral-100 p-2.5 dark:border-neutral-800">
          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900">
            <span aria-hidden="true" className="text-neutral-400">⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats..." aria-label="Search chats" className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 && <div className="p-6 text-center text-xs text-neutral-400">No {filter.toLowerCase()} chats</div>}
          {filtered.map((c) => {
            const lastMessage = messages.filter((m) => m.chat_id === c.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            return <button key={c.id} type="button" onClick={() => { setSelectedId(c.id); setError(null); }}
              className={`block w-full border-b border-neutral-100 px-3.5 py-3 text-left transition-colors dark:border-neutral-800 ${selectedId === c.id ? 'border-l-[3px] border-l-red-600 bg-red-50/70 dark:bg-red-950/25' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.customer_name || 'Website visitor'}</span>
                <span className="shrink-0 text-[10px] text-neutral-400">{stamp(lastMessage?.created_at ?? c.created_at)}</span>
              </div>
              <div className="mt-1 truncate text-xs text-neutral-500">{lastMessage?.message || c.customer_email || c.customer_phone || 'New conversation'}</div>
              <div className="mt-1 truncate text-[10px] text-neutral-400">{c.customer_email || c.customer_phone || 'Website chat'} · Started {stamp(c.created_at)}</div>
            </button>;
          })}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-neutral-950">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-3">
            {selected && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">{(selected.customer_name || 'C').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</div>}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{selected?.customer_name || 'Customer Support'}</div>
              <div className="flex items-center gap-1.5 truncate text-xs text-neutral-500">{selected && <span className="h-2 w-2 rounded-full bg-emerald-500" />}<span className="truncate">{selected ? [selected.customer_email, selected.customer_phone].filter(Boolean).join(' · ') || 'Online' : 'Select a conversation from the list'}</span></div>
            </div>
            {selected && <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-neutral-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[selected.status] ?? '#888' }} />{selected.status}</span>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {selected && <>
              <button type="button" onClick={downloadTranscript} className="rounded-lg border border-neutral-200 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800" title="Download this customer's transcript">Download chat</button>
              {selected.status !== 'Pending' && selected.status !== 'Resolved' && <button type="button" disabled={isPending} onClick={() => moveTo('Pending')} className="rounded-lg border border-amber-300 px-2.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:text-amber-300">Move to pending</button>}
              {selected.status !== 'Resolved' && <button type="button" disabled={isPending} onClick={() => moveTo('Resolved')} className="rounded-lg bg-red-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">Resolve</button>}
              {selected.status === 'Resolved' && <button type="button" disabled={isPending} onClick={() => moveTo('Open')} className="rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Reopen</button>}
            </>}
            <span className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
            <button type="button" onClick={() => setWindowMode((mode) => mode === 'normal' ? 'minimized' : 'normal')} className="rounded-lg border border-neutral-200 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800" title={windowMode === 'minimized' ? 'Restore chat to page layout' : 'Minimize chat to a centered window'}>{windowMode === 'minimized' ? 'Restore' : 'Minimize'}</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-neutral-50/60 p-4 dark:bg-neutral-900/30" aria-live="polite">
          {!selected && <div className="flex h-full items-center justify-center text-center text-sm text-neutral-400">Select a chat on the left to view the conversation.</div>}
          {selected && thread.length === 0 && <div className="flex h-full items-center justify-center text-center text-sm text-neutral-400">No messages yet. Send a reply below to begin.</div>}
          {selected && <div className="flex min-h-full flex-col justify-end gap-3">
            {thread.map((m) => <div key={m.id} className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${m.sender === 'agent' ? 'ml-auto rounded-br-md bg-red-600 text-white' : 'mr-auto rounded-bl-md bg-white text-neutral-900 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700'}`}>
              <MessageContent message={m.message} />
              <div className={`mt-1.5 text-[10px] ${m.sender === 'agent' ? 'text-red-100' : 'text-neutral-500 dark:text-neutral-400'}`}>{stamp(m.created_at)}</div>
            </div>)}
          </div>}
        </div>

        {error && <div role="alert" className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <form className="flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input type="file" id="jaad-livechat-file-input" className="hidden" disabled={!selected || isPending} onChange={(e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (!file || !selected) return;
            setError(null);
            const fd = new FormData();
            fd.set('file', file);
            startTransition(async () => {
              const res = await uploadLiveChatFile(selected.id, fd);
              if (res?.error) setError(res.error);
              else router.refresh();
            });
            input.value = '';
          }} />
          <label htmlFor="jaad-livechat-file-input" title="Attach an image or file" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg ${selected && !isPending ? 'cursor-pointer border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800' : 'cursor-not-allowed border-neutral-100 text-neutral-300 dark:border-neutral-800 dark:text-neutral-700'}`}>📎</label>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} disabled={!selected || isPending} placeholder={selected ? 'Type a message...' : 'Select a chat to reply'} aria-label="Type a chat message" className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:disabled:bg-neutral-900" />
          <button type="submit" disabled={!selected || !draft.trim() || isPending} className="h-11 shrink-0 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Sending…' : 'Send'}</button>
        </form>
      </section>
    </div>
  );

  return isFloating
    ? (portalReady ? createPortal(panel, document.body) : null)
    : panel;
}
