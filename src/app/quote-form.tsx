'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function QuoteForm() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please fill in your name and phone number.');
      return;
    }
    setError(null);
    setSending(true);

    const { error } = await supabase.from('leads').insert({
      company: name.trim(),
      contact_name: name.trim(),
      phone: phone.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      source: 'Website',
      priority: 'Warm',
      status: 'New',
      value: 0,
    });

    setSending(false);
    if (error) {
      setError('Something went wrong, please try again.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-sm border border-[#eceef0] bg-white p-8 text-center">
        <p className="text-[15px] font-semibold text-[#0b0b0d]">Thanks, {name.split(' ')[0]}!</p>
        <p className="mt-1.5 text-[13.5px] text-[#6c6c72]">We&apos;ve got your details, our team will call you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3.5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-sm border border-[#d8d8db] px-4 py-3 text-sm outline-none focus:border-[#e5231b]" />
        <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-sm border border-[#d8d8db] px-4 py-3 text-sm outline-none focus:border-[#e5231b]" />
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <input placeholder="Pickup location" value={origin} onChange={(e) => setOrigin(e.target.value)} className="rounded-sm border border-[#d8d8db] px-4 py-3 text-sm outline-none focus:border-[#e5231b]" />
        <input placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} className="rounded-sm border border-[#d8d8db] px-4 py-3 text-sm outline-none focus:border-[#e5231b]" />
      </div>
      <textarea
        placeholder="What are you shipping, and roughly how much?"
        rows={4}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="w-full rounded-sm border border-[#d8d8db] px-4 py-3 text-sm outline-none focus:border-[#e5231b]"
      />
      {error && <p className="text-[13px] text-[#e5231b]">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-sm bg-[#e5231b] px-6 py-3 text-[13.5px] font-bold text-white hover:bg-[#b8140d] disabled:opacity-60 sm:w-auto"
      >
        {sending ? 'Sending...' : 'Send request'}
      </button>
    </form>
  );
}
