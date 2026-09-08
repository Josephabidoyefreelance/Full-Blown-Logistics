'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Message = { id: string; chat_id: string; sender: string; message: string; created_at: string };

const STORAGE_KEY = 'jaad_chat_id';

export default function ChatWidgetPage() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedNotice, setResolvedNotice] = useState(false);
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On mount, check for a returning visitor's chat.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setChatId(saved);
  }, []);

  // Load history + subscribe to live updates, and watch for the chat being
  // resolved by staff so this visitor starts fresh if they message again.
  useEffect(() => {
    if (!chatId) return;

    let active = true;

    supabase
      .from('live_chat_messages')
      .select('id, chat_id, sender, message, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active && data) setMessages(data);
      });

    const messagesChannel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    const statusChannel = supabase
      .channel(`chat-status-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_chats', filter: `id=eq.${chatId}` },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status === 'Resolved') {
            localStorage.removeItem(STORAGE_KEY);
            setChatId(null);
            setMessages([]);
            setName('');
            setResolvedNotice(true);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [chatId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startChat() {
    if (!name.trim()) return;
    setStarting(true);
    setError(null);
    setResolvedNotice(false);
    const { data, error } = await supabase
      .from('live_chats')
      .insert({ customer_name: name.trim(), status: 'Open' })
      .select('id')
      .single();
    setStarting(false);
    if (error || !data) {
      setError(error?.message ?? 'Could not start chat.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, data.id);
    setChatId(data.id);
  }

  async function sendMessage() {
    if (!draft.trim() || !chatId) return;
    setSending(true);
    setError(null);
    const { error } = await supabase.from('live_chat_messages').insert({
      chat_id: chatId,
      sender: 'customer',
      message: draft.trim(),
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDraft('');
  }

  async function sendFile(file: File) {
    if (!chatId) return;
    setError(null);
    const path = `livechat/${chatId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const { data: pub } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    const { error } = await supabase.from('live_chat_messages').insert({
      chat_id: chatId,
      sender: 'customer',
      message: `📎 ${file.name}|${pub.publicUrl}`,
    });
    if (error) setError(error.message);
  }

  function renderMessage(message: string) {
    const match = message.match(/^📎 (.+)\|(https?:\/\/\S+)$/);
    if (match) {
      const [, filename, url] = match;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          📎 {filename}
        </a>
      );
    }
    return message;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-sm" style={{ height: 560 }}>
        <div className="flex items-center gap-3 bg-black px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JAAD Logistics" className="h-8 w-8 rounded" />
          <div className="text-sm font-bold tracking-wide text-white">JAAD LOGISTICS SUPPORT</div>
        </div>

        {!chatId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
            {resolvedNotice && (
              <p className="text-center text-sm text-green-600">
                That chat was marked resolved. Start a new one below.
              </p>
            )}
            <p className="text-center text-sm text-neutral-600">Start a chat with our support team.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500"
            />
            <button
              onClick={startChat}
              disabled={starting}
              className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {starting ? 'Starting...' : 'Start chat'}
            </button>
          </div>
        )}

        {chatId && (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="pt-10 text-center text-sm text-neutral-400">
                  You&apos;re connected. Send a message to get started.
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    m.sender === 'customer' ? 'ml-auto bg-red-600 text-white' : 'bg-neutral-100 text-neutral-900'
                  }`}
                >
                  {renderMessage(m.message)}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {error && <p className="px-4 text-xs text-red-600">{error}</p>}

            <div className="flex items-center gap-2 border-t border-neutral-200 p-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) sendFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 text-lg text-neutral-500 hover:text-neutral-700"
                title="Attach a file"
              >
                📎
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="Type a message..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-500"
              />
              <button
                onClick={sendMessage}
                disabled={sending}
                className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
