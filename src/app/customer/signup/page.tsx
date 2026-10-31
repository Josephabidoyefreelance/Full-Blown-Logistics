'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import PolicyPdfLink from '@/components/PolicyPdfLink';

const COUNTRY_CODES = [
  { code: '+234', label: '🇳🇬 +234' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+233', label: '🇬🇭 +233' },
  { code: '+254', label: '🇰🇪 +254' },
  { code: '+27', label: '🇿🇦 +27' },
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+33', label: '🇫🇷 +33' },
];

function readErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

export default function CustomerSignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<'details' | 'code'>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+234');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    if (!firstName.trim() || !lastName.trim() || !businessName.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your business name, first name, last name, email, and phone number.');
      return;
    }
    setError(null);
    setLoading(true);

    let authError: { message: string } | null = null;
    try {
      const result = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      authError = result.error;
    } catch (err) {
      setLoading(false);
      setError(readErrorMessage(err, "Unable to send the code because the connection failed. Try again."));
      return;
    }

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
    if (!/^\d{6,8}$/.test(code.trim())) {
      setError('Enter the code we emailed you.');
      return;
    }
    setError(null);
    setLoading(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const fullPhone = `${countryCode}${phone.trim().replace(/^0+/, '')}`;

    let data: { user: { id: string } | null } = { user: null };
    let authError: { message: string } | null = null;
    try {
      const result = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      data = result.data;
      authError = result.error;
    } catch (err) {
      setLoading(false);
      setError(readErrorMessage(err, "Unable to contact Supabase to verify the code. Check your connection and try again."));
      return;
    }

    if (authError || !data.user) {
      setLoading(false);
      setError(readErrorMessage(authError, 'That code did not work, please try again.'));
      return;
    }

    // OTP is already verified. Only the trusted server can provision a company.
    // A verified user without a workspace can retry registration safely.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token || session.user.id !== data.user.id) {
      setLoading(false);
      setError('Your email was verified, but a secure session could not be established. Please sign in again.');
      return;
    }

    try {
      const response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          contactName: fullName,
          phone: fullPhone,
        }),
      });
      const result: { error?: string; companyId?: string } = await response.json();
      if (!response.ok || !result.companyId) {
        setError(result.error || 'Email verified, but workspace setup failed. Please try again.');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(readErrorMessage(err, 'Network error while creating your workspace. Please try again.'));
      setLoading(false);
      return;
    }

    if (!remember && typeof window !== 'undefined') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) sessionStorage.setItem('jaad_session_only', '1');
    }

    setLoading(false);
    router.push('/customer/dashboard'); // Existing customer-ERP lock and plan enforcement remain unchanged.
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
        className="absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-[#ff6b64] bg-[#e5231b] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#c91c16]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to website
      </Link>

      <div className="relative w-full max-w-[680px]">
        <div className="grid grid-cols-1 overflow-hidden rounded-[20px] border border-red-700/60 bg-white shadow-[0_24px_100px_rgba(0,0,0,.65)] md:grid-cols-[.9fr_1.1fr]">
          <div className="flex min-h-[170px] flex-col items-center justify-center gap-3 border-b border-red-700/50 bg-[#09090b] p-6 md:min-h-[450px] md:border-b-0 md:border-r">
            <Image src="/logo.png" alt="JAAD Logistics" width={132} height={86} className="mx-auto block object-contain" style={{ display: "block", marginLeft: "auto", marginRight: "auto", objectFit: "contain" }} />

            <p className="text-center text-xs text-zinc-400">Create your secure business workspace</p>
          </div>

          <div className="min-w-0 bg-white px-7 pb-8 pt-7 text-zinc-900 md:flex md:flex-col md:justify-center">
            <h1 className="text-center text-2xl font-bold text-[#0b0b0d]">Create Account</h1>

            {step === 'details' ? (
              <>
                <div className="mt-7 space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">First name</label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Last name</label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Business name</label>
                    <input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      maxLength={150}
                      className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Phone number</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-3 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="8012345678"
                        className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      />
                    </div>
                  </div>
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
                  className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#e5231b] py-4 text-[15px] font-bold text-white transition hover:bg-[#c91c16] disabled:opacity-60"
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
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                    placeholder="00000000"
                    maxLength={8}
                    className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-center text-lg tracking-[.35em] outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                  />
                </div>

                {error && <p className="mt-3 px-1 text-[13px] text-[#e5231b]">{error}</p>}

                <button
                  onClick={verifyCode}
                  disabled={loading}
                  className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#e5231b] py-4 text-[15px] font-bold text-white transition hover:bg-[#c91c16] disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => { setStep('details'); setCode(''); setError(null); }}
                  className="mt-3 w-full text-center text-[12.5px] font-semibold text-[#6c6c72]"
                >
                  Use a different email
                </button>
              </>
            )}

            <p className="mt-6 text-center text-[13px] text-[#6c6c72]">
              Already have an account? <Link href="/customer/login" className="font-semibold text-[#e5231b] underline">Log In</Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-white/60">
          By continuing, you agree to
          <br />
          <PolicyPdfLink title="Terms of Service" href="/documents/JAAD-LOGISTICS-Terms-of-Service.pdf" className="underline" /> and{' '}
          <PolicyPdfLink title="Privacy Policy" href="/documents/JAAD-LOGISTICS-Privacy-Policy.pdf" className="underline" />.
        </p>
      </div>
    </div>
  );
}
