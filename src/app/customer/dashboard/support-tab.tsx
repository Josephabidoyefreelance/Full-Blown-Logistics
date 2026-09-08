'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import EmailPanel from './email-panel';

// Fallback only, used until the business owner sets a real number in
// Profile. Once customer.support_phone is set, that value wins.
const JAAD_SUPPORT_PHONE = '+2348061472153';

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

const SUB_TABS = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'call', label: 'Call' },
  { key: 'whatsapp', label: 'WhatsApp' },
] as const;

type SubTab = (typeof SUB_TABS)[number]['key'];

export default function SupportTab({
  userId,
  customerName,
  supportPhone,
  muted,
}: {
  userId: string;
  customerName: string | null;
  supportPhone: string | null;
  muted?: boolean;
}) {
  const supabase = createClient();
  const [sub, setSub] = useState<SubTab>('email');

  const phone = supportPhone || JAAD_SUPPORT_PHONE;
  const whatsappDigits = phone.replace(/[^\d]/g, '');

  const [chatId, setChatId] = useState<string | null>(null);
  const [customerRef, setCustomerRef] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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
      .channel(`support_chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          if (incoming.sender !== 'customer') playBeep();
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

  function shortRef(id: string) {
    return `JAAD-${id.slice(0, 8).toUpperCase()}`;
  }

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
    setCustomerRef(shortRef(id));

    const { data: msgs, error: msgError } = await supabase
      .from('live_chat_messages')
      .select('id, chat_id, sender, message, created_at')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });

    if (msgError) setError(msgError.message);
    setMessages(msgs ?? []);
    setLoading(false);
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
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file);
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
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold text-[var(--text)]">Support</h3>
        <p className="text-[13px] text-[var(--subtext)]">
          Live chat, email, SMS, call and WhatsApp with our team.
          {customerRef && (
            <>
              {' '}Your reference: <span className="font-mono font-semibold text-[var(--text)]">{customerRef}</span>
            </>
          )}
        </p>
      </div>

      <div className="mb-5 flex gap-1 border-b border-[var(--border)]">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`px-4 py-2.5 text-[13px] font-semibold ${
              sub === t.key
                ? 'border-b-2 border-[#e5231b] text-[var(--text)]'
                : 'text-[var(--subtext)] hover:text-[var(--text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'email' && <EmailPanel userId={userId} />}

      {sub === 'sms' && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h4 className="mb-1 text-sm font-bold text-[var(--text)]">SMS support</h4>
          <p className="mb-4 text-[13px] text-[var(--subtext)]">
            Send a text to our support line from your phone.
          </p>
          <a
            href={`sms:${phone}`}
            className="inline-block rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            Text {phone}
          </a>
          <p className="mt-3 text-[11px] text-[var(--subtext)]">
            In-app SMS sending isn&apos;t connected yet. This opens your phone&apos;s messaging app instead.
          </p>
        </div>
      )}

      {sub === 'call' && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h4 className="mb-1 text-sm font-bold text-[var(--text)]">Call support</h4>
          <p className="mb-4 text-[13px] text-[var(--subtext)]">
            Call our support line directly.
          </p>
          <a
            href={`tel:${phone}`}
            className="inline-block rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            Call {phone}
          </a>
          <p className="mt-3 text-[11px] text-[var(--subtext)]">
            In-app calling isn&apos;t connected yet. This dials from your phone instead.
          </p>
        </div>
      )}

      {sub === 'whatsapp' && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h4 className="mb-1 text-sm font-bold text-[var(--text)]">WhatsApp support</h4>
          <p className="mb-4 text-[13px] text-[var(--subtext)]">
            Message us on WhatsApp.
          </p>
          <a
            href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
              `Hi, I'm ${customerName ?? 'a customer'} (ref ${customerRef ?? ''}). `
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-sm bg-[#25D366] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            Open WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
