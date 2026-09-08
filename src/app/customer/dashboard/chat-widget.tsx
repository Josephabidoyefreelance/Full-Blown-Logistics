'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Message = {
  id: string;
  chat_id: string;
  sender: string;
  message: string;
  created_at: string;
};

function parseAttachment(message: string): { filename: string; url: string } | null {
  const match = message.match(/^\u{1F4CE} (.+)\|(https?:\/\/\S+)$/u);
  if (!match) return null;
  return { filename: match[1], url: match[2] };
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
function isImageFile(filename: string) {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function ChatWidget({
  userId,
  customerName,
  muted,
}: {
  userId: string;
  customerName: string | null;
  muted?: boolean;
}) {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function playBeep() {
    if (muted) return;
    if (typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 700;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // audio not available, ignore
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chatId || !customerName) return;
    supabase.from('live_chats').update({ customer_name: customerName }).eq('id', chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, customerName]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`live_chat_messages_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          if (incoming.sender !== 'customer') {
            playBeep();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function init() {
    setLoading(true);
    setError(null);

    const { data: existing, error: findError } = await supabase
      .from('live_chats')
      .select('id, customer_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      setError(findError.message);
      setLoading(false);
      return;
    }

    let id = existing?.id ?? null;

    if (!id) {
      const { data: created, error: createError } = await supabase
        .from('live_chats')
        .insert({ user_id: userId, customer_name: customerName ?? 'Customer', status: 'Open' })
        .select('id')
        .single();

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }
      id = created.id;
    } else if (customerName && existing.customer_name !== customerName) {
      await supabase.from('live_chats').update({ customer_name: customerName }).eq('id', id);
    }

    setChatId(id);

    const { data: msgs, error: msgError } = await supabase
      .from('live_chat_messages')
      .select('id, chat_id, sender, message, created_at')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });

    if (msgError) setError(msgError.message);
    setMessages(msgs ?? []);
    setLoading(false);
    setInitialized(true);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !chatId) return;

    setSending(true);
    const { data, error } = await supabase
      .from('live_chat_messages')
      .insert({ chat_id: chatId, sender: 'customer', message: text.trim() })
      .select('id, chat_id, sender, message, created_at')
      .single();
    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  }

  async function handleSend() {
    const text = draft;
    setDraft('');
    await sendMessage(text);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    setUploading(true);
    setError(null);

    try {
      const path = `livechat/${chatId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);
      await sendMessage(`\u{1F4CE} ${file.name}|${publicUrlData.publicUrl}`);
    } catch (err: any) {
      setError(err?.message ?? 'File upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[600px] max-h-[80vh] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[#0b0b0d] p-4">
            <Image src="/logo.png" alt="JAAD Logistics" width={28} height={28} />
            <div>
              <div className="text-sm font-bold text-white">JAAD Support</div>
              <div className="text-[11px] text-[#9a9aa0]">We usually reply fast</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-[13px] font-semibold text-[#9a9aa0]"
            >
              Close
            </button>
          </div>

          {error && (
            <div className="border-b border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-[12px] text-[var(--error-text)]">
              {error}
            </div>
          )}

          <div className="flex-1 space-y-2.5 overflow-y-auto overflow-x-hidden p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--subtext)]">
                Loading support chat...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-[var(--subtext)]">
                Send a message to start the conversation.
              </div>
            ) : (
              messages.map((m) => {
                const isCustomer = m.sender === 'customer';
                const attachment = parseAttachment(m.message);
                return (
                  <div key={m.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] min-w-0 break-words whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm ${
                        isCustomer ? 'bg-[#e5231b] text-white' : 'bg-[var(--input-bg)] text-[var(--text)]'
                      }`}
                    >
                      {attachment ? (
                        isImageFile(attachment.filename) ? (
                          <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="max-h-48 w-auto max-w-full rounded-md border border-black/10 object-contain"
                            />
                            <span className="mt-1 block truncate text-[10px] opacity-70">{attachment.filename}</span>
                          </a>
                        ) : (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-md border border-black/10 bg-black/10 px-2.5 py-2"
                          >
                            <span className="text-base">{'\u{1F4C4}'}</span>
                            <span className="truncate text-[13px] underline">{attachment.filename}</span>
                          </a>
                        )
                      ) : (
                        m.message
                      )}
                      <div className={`mt-1 text-[10px] ${isCustomer ? 'text-white/70' : 'text-[var(--subtext)]'}`}>
                        {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !chatId}
              aria-label="Attach file"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--input-border)] text-[var(--subtext)] disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
              placeholder="Type a message..."
              className="flex-1 rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <button
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="rounded-sm bg-[#e5231b] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#e5231b] shadow-lg hover:bg-[#c91d16]"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </>
  );
}
