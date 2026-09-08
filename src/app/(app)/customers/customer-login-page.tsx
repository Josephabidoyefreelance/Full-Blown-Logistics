'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function CustomerLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    if (error) {
      setError('We could not find an account with that email. Sign up instead?');
      return;
    }
    setStep('code');
  }

  async function verifyCode() {
    if (!code.trim()) {
      setError('Enter the code we emailed you.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/customer/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="JAAD Logistics" width={64} height={64} />
        </div>

        <div className="rounded-lg bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          {step === 'email' ? (
            <>
              <h1 className="mb-1 text-xl font-bold text-[#0b0b0d]">Welcome back</h1>
              <p className="mb-6 text-[13.5px] text-[#6c6c72]">Enter your email and we&apos;ll send you a login code.</p>

              <label className="mb-1.5 block text-xs font-semibold text-[#6c6c72]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                className="w-full rounded-sm border border-[#d8d8db] px-3.5 py-2.5 text-sm outline-none focus:border-[#e5231b]"
              />

              {error && <p className="mt-3 text-[13px] text-[#e5231b]">{error}</p>}

              <button
                onClick={sendCode}
                disabled={loading}
                className="mt-6 w-full rounded-sm bg-[#e5231b] py-2.5 text-[13.5px] font-bold text-white hover:bg-[#b8140d] disabled:opacity-60"
              >
                {loading ? 'Sending code...' : 'Send login code'}
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-[#0b0b0d]">Check your email</h1>
              <p className="mb-6 text-[13.5px] text-[#6c6c72]">We sent a 6-digit code to {email}. Enter it below.</p>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                placeholder="000000"
                className="w-full rounded-sm border border-[#d8d8db] px-3.5 py-3 text-center text-lg tracking-[.3em] outline-none focus:border-[#e5231b]"
              />

              {error && <p className="mt-3 text-[13px] text-[#e5231b]">{error}</p>}

              <button
                onClick={verifyCode}
                disabled={loading}
                className="mt-6 w-full rounded-sm bg-[#e5231b] py-2.5 text-[13.5px] font-bold text-white hover:bg-[#b8140d] disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Log in'}
              </button>
              <button
                onClick={() => setStep('email')}
                className="mt-3 w-full text-[12.5px] font-semibold text-[#6c6c72]"
              >
                Use a different email
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-[#8a8a90]">
          New here? <Link href="/customer/signup" className="font-semibold text-[#e5231b]">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
