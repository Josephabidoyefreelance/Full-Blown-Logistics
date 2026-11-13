'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function CustomerSignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<'details' | 'code'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email, and phone number.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
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

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    if (error || !data.user) {
      setLoading(false);
      setError(error?.message ?? 'That code did not work, please try again.');
      return;
    }

    // Matches your real customers table: name, type, contact, credit_limit,
    // balance, status, client_since, plus the new user_id/email/phone columns.
    await supabase.from('customers').insert({
      user_id: data.user.id,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      contact: phone.trim(),
      type: 'Individual',
      status: 'Active',
      client_since: new Date().toISOString().slice(0, 10),
      credit_limit: 0,
      balance: 0,
    });

    // Also drop this signup into the CRM as a new lead, so sales sees it.
    await supabase.from('leads').insert({
      company: name.trim(),
      contact_name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      source: 'Website',
      priority: 'Warm',
      status: 'New',
      value: 0,
    });

    setLoading(false);
    router.push('/customer/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="JAAD Logistics" width={64} height={64} />
        </div>

        <div className="rounded-lg bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          {step === 'details' ? (
            <>
              <h1 className="mb-1 text-xl font-bold text-[#0b0b0d]">Create your account</h1>
              <p className="mb-6 text-[13.5px] text-[#6c6c72]">Track shipments, view invoices, and talk to our team, all in one place.</p>

              <div className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6c6c72]">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-sm border border-[#d8d8db] px-3.5 py-2.5 text-sm outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6c6c72]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-sm border border-[#d8d8db] px-3.5 py-2.5 text-sm outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6c6c72]">Phone number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-sm border border-[#d8d8db] px-3.5 py-2.5 text-sm outline-none focus:border-[#e5231b]"
                  />
                </div>
              </div>

              {error && <p className="mt-3 text-[13px] text-[#e5231b]">{error}</p>}

              <button
                onClick={sendCode}
                disabled={loading}
                className="mt-6 w-full rounded-sm bg-[#e5231b] py-2.5 text-[13.5px] font-bold text-white hover:bg-[#b8140d] disabled:opacity-60"
              >
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-[#0b0b0d]">Check your email</h1>
              <p className="mb-6 text-[13.5px] text-[#6c6c72]">We sent a 6-digit code to {email}. Enter it below.</p>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="w-full rounded-sm border border-[#d8d8db] px-3.5 py-3 text-center text-lg tracking-[.3em] outline-none focus:border-[#e5231b]"
              />

              {error && <p className="mt-3 text-[13px] text-[#e5231b]">{error}</p>}

              <button
                onClick={verifyCode}
                disabled={loading}
                className="mt-6 w-full rounded-sm bg-[#e5231b] py-2.5 text-[13.5px] font-bold text-white hover:bg-[#b8140d] disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Verify and continue'}
              </button>
              <button
                onClick={() => setStep('details')}
                className="mt-3 w-full text-[12.5px] font-semibold text-[#6c6c72]"
              >
                Use a different email
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-[#8a8a90]">
          Already have an account? <Link href="/customer/login" className="font-semibold text-[#e5231b]">Log in</Link>
        </p>
      </div>
    </div>
  );
}
