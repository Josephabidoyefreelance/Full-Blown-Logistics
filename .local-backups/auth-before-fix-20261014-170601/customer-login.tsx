'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { LegalDocModal, useLegalModal } from '@/components/legal-modal';

function readErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

export default function CustomerLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { openDoc, setOpenDoc } = useLegalModal();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    if (authError) {
      console.error('signInWithOtp failed:', authError);
      setError(readErrorMessage(authError, 'Could not send the code, please try again.'));
      return;
    }
    setStep('code');
    setCooldown(30);
  }

  async function verifyCode() {
    if (!code.trim()) {
      setError('Enter the code we emailed you.');
      return;
    }
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    if (authError || !data.user) {
      setLoading(false);
      console.error('verifyOtp failed:', authError);
      setError(readErrorMessage(authError, 'That code did not work, please try again.'));
      return;
    }

    // Gate: only customers with an active subscription may enter the dashboard.
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('subscription_status')
      .eq('user_id', data.user.id)
      .single();

    if (customerError || !customer) {
      await supabase.auth.signOut();
      setLoading(false);
      setError('We could not find an account for this email. Contact support.');
      return;
    }

    if (customer.subscription_status !== 'active') {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        customer.subscription_status === 'past_due'
          ? 'Your subscription payment is overdue. Please renew to regain access.'
          : 'You do not have an active subscription yet. Choose a plan to get started.'
      );
      return;
    }

    if (!remember && typeof window !== 'undefined') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) sessionStorage.setItem('jaad_session_only', '1');
    }

    setLoading(false);
    router.push('/customer/dashboard');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0d] px-5 py-10">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt=""
          width={900}
          height={900}
          className="w-[85%] max-w-[560px] opacity-[0.14]"
        />
      </div>

      <Link
        href="/"
        className="absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12.5px] font-semibold text-white/80 backdrop-blur transition hover:bg-white/10"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to website
      </Link>

      <div className="relative w-full max-w-[400px]">
        <div className="overflow-hidden rounded-[32px] bg-[#faf9f8] shadow-[0_30px_80px_rgba(0,0,0,.5)]">
          <div className="flex items-center justify-center bg-[#0b0b0d] py-8">
            <Image src="/logo.png" alt="JAAD Logistics" width={56} height={56} />
          </div>

          <div className="px-7 pb-8 pt-7">
            <h1 className="text-center text-2xl font-bold text-[#0b0b0d]">Sign In</h1>

            {step === 'email' ? (
              <>
                <div className="mt-7">
                  <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                    className="w-full rounded-full border-0 bg-[#ececec] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                  />
                </div>

                <label className="mt-4 flex items-center gap-2 px-1 text-[12.5px] text-[#6c6c72]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#e5231b]"
                  />
                  Keep me signed in on this device
                </label>

                {error && <p className="mt-3 px-1 text-[13px] text-[#e5231b]">{error}</p>}

                <button
                  onClick={sendCode}
                  disabled={loading || cooldown > 0}
                  className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0b0b0d] py-4 text-[15px] font-bold text-white transition hover:bg-[#e5231b] disabled:opacity-60"
                >
                  {loading ? 'Sending code...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Code'}
                  {!loading && cooldown === 0 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="mx-auto mt-2 max-w-[260px] text-center text-[13px] text-[#8a8a90]">
                  Enter the code we sent to {email}.
                </p>

                <div className="mt-6">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                    placeholder="00000000"
                    maxLength={8}
                    className="w-full rounded-full border-0 bg-[#ececec] px-5 py-3.5 text-center text-lg tracking-[.35em] outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                  />
                </div>

                {error && <p className="mt-3 px-1 text-[13px] text-[#e5231b]">{error}</p>}

                <button
                  onClick={verifyCode}
                  disabled={loading}
                  className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0b0b0d] py-4 text-[15px] font-bold text-white transition hover:bg-[#e5231b] disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => { setStep('email'); setCode(''); setError(null); }}
                  className="mt-3 w-full text-center text-[12.5px] font-semibold text-[#6c6c72]"
                >
                  Use a different email
                </button>
              </>
            )}

            <p className="mt-6 text-center text-[13px] text-[#6c6c72]">
              Don&apos;t have an account yet? <Link href="/customer/signup" className="font-semibold text-[#e5231b] underline">Create Account</Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-white/60">
          By continuing, you agree to
          <br />
          <button onClick={() => setOpenDoc('terms-of-use')} className="underline hover:text-white">Terms of Service</button> and{' '}
          <button onClick={() => setOpenDoc('privacy-policy')} className="underline hover:text-white">Privacy Policy</button>.
        </p>
      </div>

      <LegalDocModal docKey={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
