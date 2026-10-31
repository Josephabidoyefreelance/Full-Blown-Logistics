'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AdminResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session))) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (active && data.session) setReady(true); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12) { setMessage('Use at least 12 characters.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setSuccess(true);
      setMessage('Password updated. Sign in again.');
    } catch {
      setMessage('Password reset failed. Request a new reset link and try again.');
    } finally {
      setBusy(false);
    }
  }
  return <main className="min-h-screen bg-[#09090b] text-zinc-900 flex items-center justify-center px-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      {!success && ready && <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm">New password<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"/></label>
        <label className="block text-sm">Confirm new password<input required type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"/></label>
        <button disabled={busy} className="w-full rounded-lg bg-red-600 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button>
      </form>}
      {!ready && !success && <p className="mt-5 text-sm text-zinc-600">Waiting for a valid recovery session. Open the link from your reset email.</p>}
      <Link href="/admin/login" className="mt-6 block text-sm text-red-600 underline">Back to administrator login</Link>
    </section>
  </main>;
}
