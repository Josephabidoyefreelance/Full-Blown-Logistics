'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendTeamChatMessage, uploadTeamChatFile } from './actions';
import MessageContent from './message-content';

type Message = { id: string; sender_name: string; message: string; created_at: string };

export default function TeamChatPanel({
  messages,
  currentUserName,
  staffNames,
}: {
  messages: Message[];
  currentUserName: string;
  staffNames: string[];
}) {
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel('team-chat-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_chat_messages' }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredStaff = useMemo(() => {
    const others = staffNames.filter((n) => n !== currentUserName);
    if (!mentionQuery) return others;
    return others.filter((n) => n.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [staffNames, currentUserName, mentionQuery]);

  function handleDraftChange(value: string) {
    setDraft(value);
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1 && (atIndex === 0 || value[atIndex - 1] === ' ')) {
      const afterAt = value.slice(atIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  }

  function insertMention(name: string) {
    const atIndex = draft.lastIndexOf('@');
    const newDraft = draft.slice(0, atIndex) + `@${name} `;
    setDraft(newDraft);
    setShowMentions(false);
    inputRef.current?.focus();
  }

  function send() {
    if (!draft.trim()) return;
    startTransition(async () => {
      await sendTeamChatMessage(currentUserName, draft);
      setDraft('');
      router.refresh();
    });
  }

  function renderMessageWithMentions(message: string) {
    const parts = message.split(/(@[A-Za-z\u00C0-\u024f]+(?:\s[A-Za-z\u00C0-\u024f]+)?)/g);
    return parts.map((part, i) => {
      const name = part.startsWith('@') ? part.slice(1).trim() : null;
      if (name && staffNames.some((s) => s.toLowerCase() === name.toLowerCase())) {
        return (
          <span key={i} className="font-semibold text-red-600">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
      style={{ minHeight: 420 }}
    >
      <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
        Team chat &mdash; all staff
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <div className="pt-10 text-center text-sm text-neutral-400">No messages yet. Say hello.</div>}
        {messages.map((m) => {
          const isMe = m.sender_name === currentUserName;
          return (
            <div key={m.id} className={`max-w-[70%] ${isMe ? 'ml-auto' : ''}`}>
              {!isMe && <div className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">{m.sender_name}</div>}
              <div className={`rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'}`}>
                {m.message.startsWith('📎 ') ? <MessageContent message={m.message} /> : renderMessageWithMentions(m.message)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="relative flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        {showMentions && filteredStaff.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {filteredStaff.map((name) => (
              <button
                key={name}
                onClick={() => insertMention(name)}
                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                @{name}
              </button>
            ))}
          </div>
        )}

        <input
          type="file"
          id="teamchat-file-input"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set('file', file);
            startTransition(async () => {
              await uploadTeamChatFile(currentUserName, fd);
              router.refresh();
            });
            e.target.value = '';
          }}
        />
        <label htmlFor="teamchat-file-input" className="shrink-0 cursor-pointer text-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300" title="Attach a file">
          📎
        </label>

        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !showMentions) send();
            if (e.key === 'Escape') setShowMentions(false);
          }}
          placeholder="Message the team... use @ to mention someone"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        />
        <button
          onClick={send}
          disabled={isPending}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
