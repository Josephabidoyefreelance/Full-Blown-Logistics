'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import PolicyPdfLink from '@/components/PolicyPdfLink';

// All 54 UN-recognised African states, plus Western Sahara, and selected European countries,
// and the non-European prefixes previously offered on this form.
const AFRICAN_DIAL_CODES = [
  { iso: 'DZ', name: 'Algeria', code: '+213' },
  { iso: 'AO', name: 'Angola', code: '+244' },
  { iso: 'BJ', name: 'Benin', code: '+229' },
  { iso: 'BW', name: 'Botswana', code: '+267' },
  { iso: 'BF', name: 'Burkina Faso', code: '+226' },
  { iso: 'BI', name: 'Burundi', code: '+257' },
  { iso: 'CV', name: 'Cabo Verde', code: '+238' },
  { iso: 'CM', name: 'Cameroon', code: '+237' },
  { iso: 'CF', name: 'Central African Republic', code: '+236' },
  { iso: 'TD', name: 'Chad', code: '+235' },
  { iso: 'KM', name: 'Comoros', code: '+269' },
  { iso: 'CG', name: 'Republic of the Congo', code: '+242' },
  { iso: 'CD', name: 'DR Congo', code: '+243' },
  { iso: 'CI', name: "Côte d'Ivoire", code: '+225' },
  { iso: 'DJ', name: 'Djibouti', code: '+253' },
  { iso: 'EG', name: 'Egypt', code: '+20' },
  { iso: 'GQ', name: 'Equatorial Guinea', code: '+240' },
  { iso: 'ER', name: 'Eritrea', code: '+291' },
  { iso: 'SZ', name: 'Eswatini', code: '+268' },
  { iso: 'ET', name: 'Ethiopia', code: '+251' },
  { iso: 'GA', name: 'Gabon', code: '+241' },
  { iso: 'GM', name: 'Gambia', code: '+220' },
  { iso: 'GH', name: 'Ghana', code: '+233' },
  { iso: 'GN', name: 'Guinea', code: '+224' },
  { iso: 'GW', name: 'Guinea-Bissau', code: '+245' },
  { iso: 'KE', name: 'Kenya', code: '+254' },
  { iso: 'LS', name: 'Lesotho', code: '+266' },
  { iso: 'LR', name: 'Liberia', code: '+231' },
  { iso: 'LY', name: 'Libya', code: '+218' },
  { iso: 'MG', name: 'Madagascar', code: '+261' },
  { iso: 'MW', name: 'Malawi', code: '+265' },
  { iso: 'ML', name: 'Mali', code: '+223' },
  { iso: 'MR', name: 'Mauritania', code: '+222' },
  { iso: 'MU', name: 'Mauritius', code: '+230' },
  { iso: 'MA', name: 'Morocco', code: '+212' },
  { iso: 'MZ', name: 'Mozambique', code: '+258' },
  { iso: 'NA', name: 'Namibia', code: '+264' },
  { iso: 'NE', name: 'Niger', code: '+227' },
  { iso: 'NG', name: 'Nigeria', code: '+234' },
  { iso: 'RW', name: 'Rwanda', code: '+250' },
  { iso: 'ST', name: 'São Tomé and Príncipe', code: '+239' },
  { iso: 'SN', name: 'Senegal', code: '+221' },
  { iso: 'SC', name: 'Seychelles', code: '+248' },
  { iso: 'SL', name: 'Sierra Leone', code: '+232' },
  { iso: 'SO', name: 'Somalia', code: '+252' },
  { iso: 'ZA', name: 'South Africa', code: '+27' },
  { iso: 'SS', name: 'South Sudan', code: '+211' },
  { iso: 'SD', name: 'Sudan', code: '+249' },
  { iso: 'TZ', name: 'Tanzania', code: '+255' },
  { iso: 'TG', name: 'Togo', code: '+228' },
  { iso: 'TN', name: 'Tunisia', code: '+216' },
  { iso: 'UG', name: 'Uganda', code: '+256' },
  { iso: 'ZM', name: 'Zambia', code: '+260' },
  { iso: 'ZW', name: 'Zimbabwe', code: '+263' },
  { iso: 'EH', name: 'Western Sahara', code: '+212' },
];
const EUROPEAN_DIAL_CODES = [
  { iso: 'GB', name: 'United Kingdom', code: '+44' },
  { iso: 'IE', name: 'Ireland', code: '+353' },
  { iso: 'FR', name: 'France', code: '+33' },
  { iso: 'DE', name: 'Germany', code: '+49' },
  { iso: 'ES', name: 'Spain', code: '+34' },
  { iso: 'IT', name: 'Italy', code: '+39' },
  { iso: 'NL', name: 'Netherlands', code: '+31' },
  { iso: 'BE', name: 'Belgium', code: '+32' },
  { iso: 'CH', name: 'Switzerland', code: '+41' },
  { iso: 'SE', name: 'Sweden', code: '+46' },
  { iso: 'NO', name: 'Norway', code: '+47' },
  { iso: 'DK', name: 'Denmark', code: '+45' },
  { iso: 'FI', name: 'Finland', code: '+358' },
  { iso: 'PL', name: 'Poland', code: '+48' },
  { iso: 'CZ', name: 'Czechia', code: '+420' },
  { iso: 'AT', name: 'Austria', code: '+43' },
  { iso: 'PT', name: 'Portugal', code: '+351' },
  { iso: 'GR', name: 'Greece', code: '+30' },
  { iso: 'RO', name: 'Romania', code: '+40' },
  { iso: 'HU', name: 'Hungary', code: '+36' },
  { iso: 'SK', name: 'Slovakia', code: '+421' },
  { iso: 'SI', name: 'Slovenia', code: '+386' },
  { iso: 'LT', name: 'Lithuania', code: '+370' },
  { iso: 'LV', name: 'Latvia', code: '+371' },
  { iso: 'EE', name: 'Estonia', code: '+372' },
  { iso: 'HR', name: 'Croatia', code: '+385' },
  { iso: 'IS', name: 'Iceland', code: '+354' },
  { iso: 'LU', name: 'Luxembourg', code: '+352' },
  { iso: 'MT', name: 'Malta', code: '+356' },
  { iso: 'CY', name: 'Cyprus', code: '+357' },
  { iso: 'BG', name: 'Bulgaria', code: '+359' },
  { iso: 'UA', name: 'Ukraine', code: '+380' },
  { iso: 'RS', name: 'Serbia', code: '+381' },
  { iso: 'BA', name: 'Bosnia and Herzegovina', code: '+387' },
  { iso: 'AL', name: 'Albania', code: '+355' },
  { iso: 'ME', name: 'Montenegro', code: '+382' },
  { iso: 'MK', name: 'North Macedonia', code: '+389' },
  { iso: 'MD', name: 'Moldova', code: '+373' },
  { iso: 'TR', name: 'Türkiye', code: '+90' },
];
const OTHER_DIAL_CODES = [
  { iso: 'US', name: 'United States / Canada', code: '+1' },
  { iso: 'IN', name: 'India', code: '+91' },
  { iso: 'AE', name: 'United Arab Emirates', code: '+971' },
  { iso: 'AU', name: 'Australia', code: '+61' },
];
const COUNTRY_CODES = [...AFRICAN_DIAL_CODES, ...EUROPEAN_DIAL_CODES, ...OTHER_DIAL_CODES];

function dialLabel(iso: string, name: string, code: string) {
  const flag = iso.toUpperCase().replace(/./g, (letter) =>
    String.fromCodePoint(letter.charCodeAt(0) + 127397));
  return `${flag} ${name} (${code})`;
}

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryIso, setCountryIso] = useState('NG');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const prefix = COUNTRY_CODES.find((entry) => entry.iso === countryIso)?.code ?? '+234';
    const digits = phone.replace(/[^0-9]/g, '');
    const nationalNumber = countryIso === 'IT' ? digits : digits.replace(/^0+/, '');
    if (!/^[+]\d{7,15}$/.test(`${prefix}${nationalNumber}`)) {
      setError('Enter a valid phone number for the selected country.');
      return;
    }
    if (password.length < 8) {
      setError('Enter a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
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
    const selectedCountry = COUNTRY_CODES.find((entry) => entry.iso === countryIso);
    const dial = selectedCountry?.code ?? '+234';
    const digits = phone.replace(/[^0-9]/g, '');
    // Italian national numbers may start with a significant zero.
    const nationalNumber = countryIso === 'IT' ? digits : digits.replace(/^0+/, '');
    const fullPhone = `${dial}${nationalNumber}`;
    if (!/^[+]\d{7,15}$/.test(fullPhone)) {
      setLoading(false);
      setError('Enter a valid phone number including the selected country code.');
      return;
    }

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

    // Set the password only after the email OTP has established an authenticated session.
    // Never send it to the company registration API or store it in browser storage.
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setLoading(false);
      setError(readErrorMessage(passwordError, 'Could not set your password. Please try again.'));
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

    setPassword('');
    setConfirmPassword('');
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
                        aria-label="Phone country code"
                        value={countryIso}
                        onChange={(e) => setCountryIso(e.target.value)}
                        className="max-w-[166px] rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-3 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      >
                        <optgroup label="African countries">
                          {AFRICAN_DIAL_CODES.map((c) => (
                            <option key={c.iso} value={c.iso}>{dialLabel(c.iso, c.name, c.code)}</option>
                          ))}
                        </optgroup>
                        <optgroup label="European countries">
                          {EUROPEAN_DIAL_CODES.map((c) => (
                            <option key={c.iso} value={c.iso}>{dialLabel(c.iso, c.name, c.code)}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Other existing locations">
                          {OTHER_DIAL_CODES.map((c) => (
                            <option key={c.iso} value={c.iso}>{dialLabel(c.iso, c.name, c.code)}</option>
                          ))}
                        </optgroup>
                      </select>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="8012345678"
                        className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Enter password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 pr-20 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 inset-y-0 flex h-full items-center justify-center rounded bg-transparent px-2 text-xs font-semibold text-[#62626b] hover:text-[#e5231b]"
                        style={{ position: 'absolute', top: 0, bottom: 0, height: '100%', transform: 'none', translate: 'none' }}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#0b0b0d]">Enter password again</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 pr-20 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showConfirmPassword}
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                        className="absolute right-3 inset-y-0 flex h-full items-center justify-center rounded bg-transparent px-2 text-xs font-semibold text-[#62626b] hover:text-[#e5231b]"
                        style={{ position: 'absolute', top: 0, bottom: 0, height: '100%', transform: 'none', translate: 'none' }}
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
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
            <p className="mt-2 text-center text-[12px]">
              <Link href="/customer/reset-password" className="font-semibold text-[#e5231b] underline">Reset password</Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-[12px] leading-relaxed text-white/60">
          By continuing, you agree to
          <br />
          <PolicyPdfLink title="Terms of Service" href="/documents/JAAD-LOGISTICS-Terms-of-Service.pdf" className="underline" /> and{' '}
          <PolicyPdfLink title="Privacy Policy" href="/documents/JAAD-LOGISTICS-Privacy-Policy.pdf" className="underline" />.
        </div>
      </div>
    </div>
  );
}
