'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (resetError) throw resetError;
      setDone(true);
    } catch {
      setError('Unable to send the reset email right now. Please try again later.');
    } finally {
      setBusy(false);
    }
  }
  return <main className="min-h-screen bg-[#09090b] text-zinc-900 flex items-center justify-center px-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="text-2xl font-bold">Reset administrator password</h1>
      <p className="mt-2 text-sm text-zinc-600">Enter your administrator email address.</p>
      {done ? <p role="status" className="mt-5 text-sm">If the address is registered, a password reset email will arrive shortly.</p> :
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full rounded-lg border border-zinc-300 p-3"/></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-red-600 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>}
      <Link href="/admin/login" className="mt-6 block text-sm text-red-600 underline">Back to administrator login</Link>
    </section>
  </main>;
}
