'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CustomerErpSignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, data: { full_name: fullName.trim(), company_name: companyName.trim(), account_type: 'jaad_erp_tenant' } } });
      if (otpError) throw otpError;
      setStep('verify');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the email verification code.'); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (otpError) throw otpError;
      const response = await fetch('/api/customer/tenant-provision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, fullName }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not set up your company workspace.');
      router.push('/packages?onboarding=company-created');
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not verify the code.'); }
    finally { setBusy(false); }
  }

  const field = 'mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-950';
  return <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-10 text-white"><section className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.22em] text-red-400">JAAD Logistics</p><h1 className="mt-3 text-2xl font-bold">Register your company ERP</h1><p className="mt-2 text-sm leading-6 text-zinc-400">Create a private workspace for your company. Your business records are separated from other JAAD tenants. You will choose a subscription after email verification.</p>
    {step === 'details' ? <form onSubmit={sendCode} className="mt-6 space-y-4"><label className="block text-xs font-semibold text-zinc-300">Company name<input required minLength={2} maxLength={160} className={field} value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></label><label className="block text-xs font-semibold text-zinc-300">Your full name<input required maxLength={160} className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label><label className="block text-xs font-semibold text-zinc-300">Business email<input required type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label><button disabled={busy} className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{busy ? 'Sending code…' : 'Send verification code'}</button></form> : <form onSubmit={verify} className="mt-6 space-y-4"><p className="text-sm text-zinc-300">Enter the verification code sent to <strong>{email}</strong>.</p><label className="block text-xs font-semibold text-zinc-300">Email verification code<input required inputMode="numeric" autoComplete="one-time-code" className={field} value={code} onChange={(e) => setCode(e.target.value)} /></label><button disabled={busy} className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{busy ? 'Verifying…' : 'Verify and create workspace'}</button><button type="button" onClick={() => setStep('details')} className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:border-red-500">Back</button></form>}
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}<p className="mt-6 text-center text-xs text-zinc-500">Already registered? <Link href="/customer/login" className="font-semibold text-red-400 hover:underline">Sign in</Link> · <Link href="/" className="text-zinc-300 hover:underline">Home</Link></p></section></main>;
}
