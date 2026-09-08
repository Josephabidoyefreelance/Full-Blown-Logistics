'use client';

import { useState } from 'react';
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

export default function AdminLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { openDoc, setOpenDoc } = useLegalModal();

  async function signIn() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (authError) {
      console.error('signInWithPassword failed:', authError);
      setError(readErrorMessage(authError, 'Could not sign in, check your email and password.'));
      return;
    }
    router.push('/dashboard');
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

            <div className="mt-7">
              <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border-0 bg-[#ececec] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && signIn()}
                  className="w-full rounded-full border-0 bg-[#ececec] px-5 py-3.5 pr-12 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6c6c72]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.7 9.7 0 0112 5c5 0 9 4 10 7-.4 1.1-1.1 2.3-2.1 3.4M6.5 6.6C4.6 8 3.3 9.9 2 12c1 3 5 7 10 7 1.2 0 2.3-.2 3.4-.6" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-3 text-right">
              <a href="#" className="text-[12.5px] font-semibold text-[#6c6c72] underline">Forgot password?</a>
            </div>

            {error && <p className="mt-3 px-1 text-[13px] text-[#e5231b]">{error}</p>}

            <button
              onClick={signIn}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0b0b0d] py-4 text-[15px] font-bold text-white transition hover:bg-[#e5231b] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-white/60">
          Internal staff access only, by signing in you agree to
          <br />
          <button onClick={() => setOpenDoc('terms-of-use')} className="underline hover:text-white">Terms of Service</button> and{' '}
          <button onClick={() => setOpenDoc('privacy-policy')} className="underline hover:text-white">Privacy Policy</button>.
        </p>
      </div>

      <LegalDocModal docKey={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
