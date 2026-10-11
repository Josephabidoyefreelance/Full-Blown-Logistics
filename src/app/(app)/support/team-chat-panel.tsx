'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendTeamChatMessage, uploadTeamChatFile, markTeamChatRead } from './actions';

type Message = {
  id: string;
  sender_name: string;
  message: string;
  created_at: string;
  recipient_name?: string | null;
  read_at?: string | null;
};

type Thread = { id: string; name: string; isGeneral: boolean; initials: string };

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
const initials = (name: string) => clean(name).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
const same = (a: string, b: string) => clean(a).toLocaleLowerCase() === clean(b).toLocaleLowerCase();
const stamp = (value: string) => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const fullStamp = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function TeamChatPanel({
  messages,
  currentUserName,
  staffNames,
}: {
  messages: Message[];
  currentUserName: string;
  staffNames: string[];
}) {
  const [activeThreadId, setActiveThreadId] = useState('general');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [windowMode, setWindowMode] = useState<'normal' | 'minimized'>('normal');
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Employee records can contain repeated display names. A stable, normalized identity
  // prevents duplicate React keys and duplicate entries in the direct-message list.
  const threads = useMemo<Thread[]>(() => {
    const seen = new Set<string>();
    const direct: Thread[] = [];
    for (const raw of staffNames) {
      const name = clean(raw);
      const key = name.toLocaleLowerCase();
      if (!name || same(name, currentUserName) || seen.has(key)) continue;
      seen.add(key);
      direct.push({ id: `direct:${key}`, name, isGeneral: false, initials: initials(name) });
    }
    return [{ id: 'general', name: 'General', isGeneral: true, initials: '#' }, ...direct];
  }, [staffNames, currentUserName]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const visibleThreads = threads.filter((thread) => thread.name.toLowerCase().includes(search.toLowerCase()));

  const threadMessages = useMemo(() => {
    if (!activeThread) return [];
    if (activeThread.isGeneral) return messages.filter((message) => !message.recipient_name);
    return messages.filter((message) =>
      (same(message.sender_name, currentUserName) && same(message.recipient_name ?? '', activeThread.name)) ||
      (same(message.sender_name, activeThread.name) && same(message.recipient_name ?? '', currentUserName))
    );
  }, [messages, activeThread, currentUserName]);

  useEffect(() => {
    const channel = supabase
      .channel('jaad-team-chat-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_chat_messages' }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, router]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [threadMessages.length, activeThreadId]);

  useEffect(() => {
    if (!activeThread || activeThread.isGeneral) return;
    startTransition(async () => {
      await markTeamChatRead(currentUserName, activeThread.name);
    });
  }, [activeThreadId, activeThread, currentUserName]);

  function send() {
    const text = draft.trim();
    if (!text || !activeThread || isPending) return;
    setError('');
    startTransition(async () => {
      const result = await sendTeamChatMessage(currentUserName, text, activeThread.isGeneral ? null : activeThread.name);
      if (result?.error) { setError(result.error); return; }
      setDraft('');
      setMentionQuery(null);
      router.refresh();
    });
  }

  function handleDraft(value: string) {
    setDraft(value);
    const at = value.lastIndexOf('@');
    if (at >= 0 && (at === 0 || /\s/.test(value[at - 1] ?? ''))) {
      const query = value.slice(at + 1);
      if (!/\s/.test(query)) { setMentionQuery(query); return; }
    }
    setMentionQuery(null);
  }

  function chooseMention(name: string) {
    const at = draft.lastIndexOf('@');
    setDraft(`${draft.slice(0, at)}@${name} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  function attachFile(file: File) {
    if (!activeThread) return;
    setError('');
    const form = new FormData();
    form.set('file', file);
    startTransition(async () => {
      const result = await uploadTeamChatFile(currentUserName, form, activeThread.isGeneral ? null : activeThread.name);
      if (result?.error) { setError(result.error); return; }
      router.refresh();
    });
  }

  function downloadChat() {
    const lines = [
      'JAAD LOGISTICS — TEAM CHAT EXPORT',
      `Conversation: ${activeThread?.name ?? 'General'}`,
      `Exported: ${fullStamp(new Date().toISOString())}`,
      '------------------------------------------------------------',
      ...threadMessages.map((message) => `[${fullStamp(message.created_at)}] ${message.sender_name}${same(message.sender_name, currentUserName) && message.read_at ? ' (read)' : ''}: ${message.message}`),
      '------------------------------------------------------------',
      'End of export',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jaad-team-chat-${(activeThread?.name ?? 'general').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function renderBody(text: string) {
    const attachment = text.match(/^📎\s*(.*?)\|(https?:\/\/\S+)$/);
    if (attachment) {
      const [, filename, url] = attachment;
      if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(filename) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) {
        return <a href={url} target="_blank" rel="noreferrer" className="block"><img src={url} alt={filename || 'Team chat image'} className="max-h-72 max-w-full rounded-lg object-contain" /><span className="mt-1 block text-xs underline">{filename || 'Open image'}</span></a>;
      }
      return <a href={url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 underline"><span>📎</span><span className="break-all">{filename || 'Download attachment'}</span></a>;
    }
    return text.split(/(@[^\s]+)/g).map((part, index) => part.startsWith('@')
      ? <span key={`${index}-${part}`} className="font-semibold text-red-600">{part}</span>
      : <span key={`${index}-${part}`}>{part}</span>);
  }

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    return staffNames.map(clean).filter((name, index, all) => name && !same(name, currentUserName) && all.findIndex((candidate) => same(candidate, name)) === index && name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);
  }, [mentionQuery, staffNames, currentUserName]);

  const isFloating = windowMode === 'minimized';
  const panel = (
    <section
      className={`${isFloating ? 'z-[100] shadow-2xl' : 'relative h-full min-h-0 w-full'} flex min-h-0 min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950`}
      style={isFloating ? { position: 'fixed', left: '50%', top: '50%', width: 'min(1400px, calc(100vw - 32px))', height: 'min(760px, calc(100dvh - 32px))', maxWidth: 'calc(100vw - 32px)', transform: 'translate(-50%, -50%)', zIndex: 100 } : undefined}
    >
      <aside className="flex w-[280px] max-w-[42%] shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Channels</div>
          <button type="button" onClick={() => setActiveThreadId('general')} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${activeThreadId === 'general' ? 'bg-red-50 text-neutral-900 ring-1 ring-red-100 dark:bg-red-950/30 dark:text-neutral-100 dark:ring-red-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 font-semibold text-red-600">#</span>
            <span className="min-w-0"><span className="block text-sm font-semibold">General</span><span className="block truncate text-xs text-neutral-500">Message the whole team</span></span>
          </button>
        </div>
        <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">Direct messages</div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-neutral-700 dark:bg-neutral-900" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {visibleThreads.filter((thread) => !thread.isGeneral).map((thread) => {
            const last = messages.filter((message) => (same(message.sender_name, currentUserName) && same(message.recipient_name ?? '', thread.name)) || (same(message.sender_name, thread.name) && same(message.recipient_name ?? '', currentUserName))).at(-1);
            return <button type="button" key={thread.id} onClick={() => setActiveThreadId(thread.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${activeThreadId === thread.id ? 'bg-red-50 ring-1 ring-red-100 dark:bg-red-950/30 dark:ring-red-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{thread.initials}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{thread.name}</span><span className="block truncate text-xs text-neutral-500">{last?.message ?? 'Start a conversation'}</span></span>
              {last && <span className="shrink-0 text-[10px] text-neutral-400">{stamp(last.created_at)}</span>}
            </button>;
          })}
          {visibleThreads.filter((thread) => !thread.isGeneral).length === 0 && <p className="px-3 py-5 text-center text-xs text-neutral-400">No staff match that search.</p>}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 font-semibold text-red-600">{activeThread?.initials ?? '#'}</span><div className="min-w-0"><h2 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{activeThread?.name ?? 'General'}</h2><p className="text-xs text-neutral-500">{activeThread?.isGeneral ? 'Message the whole team. Type @ to mention a member.' : 'Direct message'}</p></div></div>
          <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={downloadChat} className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900">Download chat</button><button type="button" onClick={() => setWindowMode((mode) => mode === 'normal' ? 'minimized' : 'normal')} className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900" title={windowMode === 'minimized' ? 'Restore chat to page layout' : 'Minimize chat to a centered window'}>{windowMode === 'minimized' ? 'Restore' : 'Minimize'}</button></div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/70 p-4 dark:bg-neutral-950">
          {threadMessages.length === 0 ? <div className="grid h-full place-items-center text-sm text-neutral-400">{activeThread?.isGeneral ? 'No team messages yet. Start the conversation.' : 'No direct messages yet. Send the first message.'}</div> : <div className="space-y-4">
            {threadMessages.map((message) => {
              const mine = same(message.sender_name, currentUserName);
              return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[min(78%,640px)] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!mine && <span className="mb-1 px-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{message.sender_name}</span>}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${mine ? 'rounded-br-md bg-red-600 text-white' : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'}`}>{renderBody(message.message)}</div>
                  <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-neutral-400" title={fullStamp(message.created_at)}><span>{stamp(message.created_at)}</span>{mine && <span className={message.read_at ? 'font-bold text-blue-500' : ''} aria-label={message.read_at ? 'Read' : 'Sent'}>{message.read_at ? '✓✓' : '✓'}</span>}</div>
                </div>
              </div>;
            })}
            <div ref={bottomRef} />
          </div>}
        </div>

        {error && <div role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}
        <form className="relative flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950" onSubmit={(event) => { event.preventDefault(); send(); }}>
          {mentionOptions.length > 0 && <div className="absolute bottom-full left-14 mb-1 w-64 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">{mentionOptions.map((name) => <button type="button" key={name.toLowerCase()} onClick={() => chooseMention(name)} className="block w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-neutral-800">@{name}</button>)}</div>}
          <input ref={fileRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) attachFile(file); event.currentTarget.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={isPending} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 text-lg hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900" aria-label="Attach file" title="Attach file">📎</button>
          <input ref={inputRef} value={draft} onChange={(event) => handleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setMentionQuery(null); }} placeholder={activeThread?.isGeneral ? 'Message the team. Type @ to tag...' : `Message ${activeThread?.name ?? 'staff'}...`} className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-neutral-700 dark:bg-neutral-900" />
          <button type="submit" disabled={isPending || !draft.trim()} className="h-10 shrink-0 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Sending…' : 'Send'}</button>
        </form>
      </div>
    </section>
  );

  return isFloating
    ? (portalReady ? createPortal(panel, document.body) : null)
    : panel;
}
