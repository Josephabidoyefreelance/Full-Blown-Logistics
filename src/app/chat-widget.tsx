'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Msg = { id: string; sender: string; message: string; created_at: string };

export default function ChatWidget() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('jaad_chat_id') : null;
    if (saved) {
      setChatId(saved);
      setStarted(true);
    }
  }, []);

  useEffect(() => {
    if (!chatId || !open) return;
    loadMessages();

    const channel = supabase
      .channel('customer-chat-' + chatId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function ensureSignedIn() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return null;
    return data.session;
  }

  async function loadMessages() {
    if (!chatId) return;
    const { data } = await supabase
      .from('live_chat_messages')
      .select('id, sender, message, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
  }

  async function startChat() {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormError('Please fill in your name, email, and phone number.');
      return;
    }
    setFormError(null);

    const session = await ensureSignedIn();
    if (!session) {
      setFormError('Chat is temporarily unavailable, please try again in a moment.');
      return;
    }

    const { data, error } = await supabase
      .from('live_chats')
      .insert({
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        status: 'Open',
        user_id: session.user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      setFormError('Could not start chat, please try again.');
      return;
    }

    localStorage.setItem('jaad_chat_id', data.id);
    setChatId(data.id);
    setStarted(true);
  }

  async function send() {
    const text = draft.trim();
    if (!text || !chatId) return;
    setSending(true);
    setDraft('');

    const { error } = await supabase
      .from('live_chat_messages')
      .insert({ chat_id: chatId, sender: 'customer', message: text });

    setSending(false);
    if (error) alert('Message could not be sent, please try again.');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;
    setUploading(true);

    const path = `${chatId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);

    if (uploadError) {
      setUploading(false);
      alert('File could not be uploaded, please try again.');
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);

    const { error: msgError } = await supabase
      .from('live_chat_messages')
      .insert({ chat_id: chatId, sender: 'customer', message: urlData.publicUrl });

    setUploading(false);
    e.target.value = '';
    if (msgError) alert('File uploaded, but could not attach it to the chat.');
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-[#e5231b] shadow-[0_8px_24px_rgba(229,35,27,.4)] transition-transform hover:scale-105"
        aria-label="Open chat"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[9999] flex h-[500px] w-[92vw] max-w-[340px] flex-col overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_rgba(0,0,0,.3)]">
          <div className="flex items-center gap-2.5 bg-[#0b0b0d] px-4 py-3.5">
            <Image src="/logo.png" alt="JAAD Logistics" width={26} height={26} />
            <span className="text-sm font-bold text-white">Chat with JAAD Logistics</span>
          </div>

          {!started ? (
            <div className="space-y-3 p-5 text-sm">
              <p className="mb-1 text-[#0b0b0d]">Hi! Tell us a bit about yourself so our team can help you properly.</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-[#d8d8db] px-3 py-2 text-sm outline-none focus:border-[#e5231b]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full rounded-lg border border-[#d8d8db] px-3 py-2 text-sm outline-none focus:border-[#e5231b]"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full rounded-lg border border-[#d8d8db] px-3 py-2 text-sm outline-none focus:border-[#e5231b]"
              />
              {formError && <p className="text-[12.5px] text-[#e5231b]">{formError}</p>}
              <button
                onClick={startChat}
                className="w-full rounded-lg bg-[#e5231b] px-3.5 py-2 text-sm font-bold text-white"
              >
                Start chat
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-[#f5f5f6] p-3">
                {messages.length === 0 && (
                  <div className="pt-6 text-center text-xs text-[#6c6c72]">No messages yet, say hello.</div>
                )}
                {messages.map((m) => {
                  const isFile = /^https?:\/\/.*\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?)/i.test(m.message);
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[78%] rounded-lg px-3 py-2 text-[13px] ${
                        m.sender === 'agent' ? 'bg-[#eceef0] text-[#0b0b0d]' : 'ml-auto bg-[#e5231b] text-white'
                      }`}
                    >
                      {isFile ? (
                        <a href={m.message} target="_blank" rel="noopener noreferrer" className="underline">
                          📎 Attached file
                        </a>
                      ) : (
                        m.message
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 border-t border-[#eceef0] p-2">
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0 text-lg text-[#6c6c72] disabled:opacity-40"
                  title="Attach a file"
                  aria-label="Attach a file"
                >
                  📎
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Type a message..."
                  className="w-full rounded-lg border border-[#d8d8db] px-3 py-2 text-[13px] outline-none"
                />
                <button
                  disabled={sending || !draft.trim()}
                  onClick={send}
                  className="shrink-0 rounded-lg bg-[#e5231b] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
