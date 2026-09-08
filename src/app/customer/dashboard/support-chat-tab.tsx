'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Message = {
  id: string;
  chat_id: string;
  sender: string;
  message: string;
  created_at: string;
};

export default function SupportChatTab({
  userId,
  customerName,
}: {
  userId: string;
  customerName: string | null;
}) {
  const supabase = createClient();

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`live_chat_messages_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
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
      .select('id')
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
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !chatId) return;

    setSending(true);
    const { data, error } = await supabase
      .from('live_chat_messages')
      .insert({ chat_id: chatId, sender: 'customer', message: text })
      .select('id, chat_id, sender, message, created_at')
      .single();
    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    setDraft('');
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-[#242428] bg-[#17171a] p-8 text-center text-sm text-[#9a9aa0]">
        Loading support chat...
      </div>
    );
  }

  return (
    <div className="flex h-[560px] flex-col rounded-lg border border-[#242428] bg-[#17171a]">
      <div className="border-b border-[#242428] p-4">
        <h3 className="text-sm font-bold text-[#f5f5f6]">Support</h3>
        <p className="text-[12px] text-[#9a9aa0]">Message our team directly.</p>
      </div>

      {error && (
        <div className="border-b border-[#4a2420] bg-[#2a1613] p-3 text-[12px] text-[#ff6b60]">{error}</div>
      )}

      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#6c6c72]">
            Send a message to start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const isCustomer = m.sender === 'customer';
            return (
              <div key={m.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm ${
                    isCustomer ? 'bg-[#e5231b] text-white' : 'bg-[#1c1c1f] text-[#f5f5f6]'
                  }`}
                >
                  {m.message}
                  <div className={`mt-1 text-[10px] ${isCustomer ? 'text-white/70' : 'text-[#6c6c72]'}`}>
                    {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-[#242428] p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-sm border border-[#2c2c30] bg-[#1c1c1f] px-3.5 py-2.5 text-sm text-[#f5f5f6] outline-none focus:border-[#e5231b]"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
