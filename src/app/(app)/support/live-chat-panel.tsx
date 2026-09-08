'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateLiveChatStatus, sendLiveChatMessage, uploadLiveChatFile } from './actions';
import MessageContent from './message-content';

type Chat = { id: string; customer_name: string; status: string };
type Message = { id: string; chat_id: string; sender: string; message: string; created_at: string };

const STATUS_COLORS: Record<string, string> = {
  Open: '#dc2626',
  Pending: '#ca8a04',
  Resolved: '#1f9d5c',
};

export default function LiveChatPanel({ chats, messages }: { chats: Chat[]; messages: Message[] }) {
  const [filter, setFilter] = useState<'Open' | 'Pending' | 'Resolved'>('Open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('agent-live-chat-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chats' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat_messages' }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const counts = {
    Open: chats.filter((c) => c.status === 'Open').length,
    Pending: chats.filter((c) => c.status === 'Pending').length,
    Resolved: chats.filter((c) => c.status === 'Resolved').length,
  };

  const filtered = chats.filter((c) => c.status === filter);
  const selected = chats.find((c) => c.id === selectedId) ?? null;
  const thread = messages.filter((m) => m.chat_id === selectedId);

  function send() {
    if (!draft.trim() || !selected) return;
    setError(null);
    startTransition(async () => {
      const res = await sendLiveChatMessage(selected.id, draft);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDraft('');
      router.refresh();
    });
  }

  function moveTo(status: 'Pending' | 'Resolved') {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await updateLiveChatStatus(selected.id, status);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (status === 'Resolved') setSelectedId(null);
      setFilter(status);
      router.refresh();
    });
  }

  return (
    <div className="grid h-full grid-cols-[320px_1fr] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800" style={{ minHeight: 420 }}>
      <div className="flex flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="flex border-b border-neutral-200 p-3 dark:border-neutral-800">
          {(['Open', 'Pending', 'Resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap first:mr-1 last:ml-1 ${
                s === 'Pending' ? 'mx-1' : ''
              } ${
                filter === s
                  ? 'bg-red-600 text-white'
                  : 'border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-3 text-center text-sm text-neutral-400">No {filter.toLowerCase()} chats</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`block w-full border-b border-neutral-100 px-4 py-3 text-left text-sm dark:border-neutral-800 ${
                selectedId === c.id ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <div className="font-medium text-neutral-900 dark:text-neutral-100">{c.customer_name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{selected.customer_name}</span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[selected.status] ?? '#888' }} />
                  {selected.status}
                </span>
              </div>
              <div className="flex gap-2">
                {selected.status !== 'Pending' && (
                  <button
                    disabled={isPending}
                    onClick={() => moveTo('Pending')}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Move to pending
                  </button>
                )}
                {selected.status !== 'Resolved' && (
                  <button
                    disabled={isPending}
                    onClick={() => moveTo('Resolved')}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm font-semibold text-neutral-400">Select a chat</span>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {!selected && <div className="pt-10 text-center text-sm text-neutral-400">Pick a chat on the left to see the conversation.</div>}
          {selected && thread.length === 0 && <div className="pt-10 text-center text-sm text-neutral-400">No messages yet.</div>}
          {selected && thread.map((m) => (
            <div
              key={m.id}
              className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                m.sender === 'agent'
                  ? 'ml-auto bg-red-600 text-white'
                  : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
              }`}
            >
              <MessageContent message={m.message} />
            </div>
          ))}
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
          <input
            type="file"
            id="livechat-file-input"
            className="hidden"
            disabled={!selected}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !selected) return;
              setError(null);
              const fd = new FormData();
              fd.set('file', file);
              startTransition(async () => {
                const res = await uploadLiveChatFile(selected.id, fd);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                router.refresh();
              });
              e.target.value = '';
            }}
          />
          <label
            htmlFor="livechat-file-input"
            className={`shrink-0 text-lg ${selected ? 'cursor-pointer text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300' : 'cursor-not-allowed text-neutral-300 dark:text-neutral-700'}`}
            title="Attach a file"
          >
            📎
          </label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            disabled={!selected}
            placeholder={selected ? 'Type a reply...' : 'Select a chat to reply'}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:disabled:bg-neutral-900"
          />
          <button
            disabled={isPending || !draft.trim() || !selected}
            onClick={send}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
