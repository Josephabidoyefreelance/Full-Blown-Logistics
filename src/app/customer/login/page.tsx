'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import PolicyPdfLink from '@/components/PolicyPdfLink';
import TurnstileBox from '@/components/turnstile-box';

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
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

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
    setCode('');

    // Local development bypass only: keep Cloudflare verification enabled in production.
    if (process.env.NODE_ENV !== 'development') {
      if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
        setError('Cloudflare security check is not configured. Please contact support.');
        return;
      }
      if (!captchaToken) {
        setError('Complete the Cloudflare security check first.');
        return;
      }

      setLoading(true);
      try {
        const verify = await fetch('/api/security/turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: captchaToken, action: 'customer_login' }),
        });
        const result = await verify.json().catch(() => ({}));
        if (!verify.ok || !result.success) {
          setError(result.error || 'Cloudflare could not verify this request. Please try again.');
          setCaptchaToken('');
          setCaptchaResetKey((v) => v + 1);
          return;
        }
      } catch {
        setError('Could not verify the security check. Please try again.');
        return;
      } finally {
        setLoading(false);
      }

      setCaptchaToken('');
      setCaptchaResetKey((v) => v + 1);
    }

    setLoading(true);

    let authError: { message: string } | null = null;
    try {
      const result = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      authError = result.error;
    } catch (err) {
      setLoading(false);
      setError(readErrorMessage(err, "Could not connect to Supabase. Check your connection and try again."));
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
      setError('Enter the 6–8 digit code from your latest email.');
      return;
    }
    setError(null);
    setLoading(true);

    let data: { user: { id: string } | null } = { user: null };
    let authError: { message: string } | null = null;
    try {
      const result = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      });
      data = result.data;
      authError = result.error;
    } catch (err) {
      setLoading(false);
      setError(readErrorMessage(err, "Could not verify the code because the connection failed. Try again."));
      return;
    }

    if (authError || !data.user) {
      setLoading(false);
      // Invalid/expired OTP is an expected user error; avoid triggering the Next.js dev error overlay.
      setError(authError?.message?.toLowerCase().includes('expired') || authError?.message?.toLowerCase().includes('invalid')
        ? 'This code is expired or invalid. Request a new code below and enter only the newest code.'
        : readErrorMessage(authError, 'That code did not work. Please request a new code.'));
      return;
    }

    // Canonical tenant membership is profiles.company_id + company_subscriptions.
    // Legacy customer/team memberships remain supported for existing customers.
    const { data: verifiedIdentity, error: identityError } = await supabase.auth.getUser();
    if (identityError || !verifiedIdentity.user || verifiedIdentity.user.id !== data.user.id) {
      await supabase.auth.signOut();
      setLoading(false);
      setError('Could not verify your authenticated account. Please sign in again.');
      return;
    }

    const isCustomerTestAccount =
      verifiedIdentity.user.email?.trim().toLowerCase() === 'josephabidoyefreelance@outlook.com';

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, status')
      .eq('id', data.user.id)
      .maybeSingle();

    let hasWorkspace = !profileError && !!profile?.company_id && profile.status === 'Active';
    let subscriptionStatus: string | null = null;

    if (hasWorkspace) {
      const { data: subscription, error: subscriptionError } = await supabase
        .from('company_subscriptions')
        .select('status')
        .eq('company_id', profile!.company_id)
        .maybeSingle();
      if (subscriptionError) {
        await supabase.auth.signOut();
        setLoading(false);
        setError('Unable to verify your workspace subscription. Please contact support.');
        return;
      }
      subscriptionStatus = subscription?.status ?? null;
    } else if (!profileError && !profile) {
      // Backward compatibility for pre-migration customer portal records.
      const { data: ownerCustomer, error: ownerError } = await supabase
        .from('customers')
        .select('subscription_status')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (!ownerError && ownerCustomer) {
        hasWorkspace = true;
        subscriptionStatus = ownerCustomer.subscription_status;
      } else {
        const { data: membership, error: membershipError } = await supabase
          .from('customer_team_members')
          .select('customer_id, status, removed_at')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (!membershipError && membership?.status === 'Active' && !membership.removed_at) {
          const { data: parentCustomer, error: parentError } = await supabase
            .from('customers')
            .select('subscription_status')
            .eq('id', membership.customer_id)
            .maybeSingle();
          if (!parentError && parentCustomer) {
            hasWorkspace = true;
            subscriptionStatus = parentCustomer.subscription_status;
          }
        }
      }
    }

    if (!hasWorkspace) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(profileError
        ? 'Unable to check your company workspace. Please try again.'
        : 'This email is verified but has no active workspace. Use Create Account to finish business registration.');
      return;
    }

    // Existing test-account exception preserved; this is not a substitute
    // for server-side subscription checks and tenant isolation.
    if (!isCustomerTestAccount && subscriptionStatus !== 'active') {
      await supabase.auth.signOut();
      setLoading(false);
      setError(subscriptionStatus === 'past_due'
        ? 'Your subscription payment is overdue. Please renew to regain access.'
        : 'Your company workspace exists, but its subscription is not active. Please contact support to activate a plan.');
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
    <div className="jaad-auth-page">

      <style>{`
        .jaad-auth-page{min-height:100svh;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;position:relative;overflow-x:hidden;overflow-y:auto;padding:92px 18px 38px;background:radial-gradient(ellipse at 84% 8%,rgba(143,22,25,.42),transparent 42%),radial-gradient(ellipse at 12% 90%,rgba(36,36,40,.25),transparent 42%),#09090b;color:#111114}
        .jaad-back{position:fixed!important;left:20px!important;top:20px!important;z-index:10000!important;display:inline-flex!important;align-items:center!important;gap:8px!important;padding:10px 15px!important;border:1px solid #ff6b64!important;border-radius:999px!important;background:#e5231b!important;color:#fff!important;text-decoration:none!important;font-size:13px!important;font-weight:800!important;line-height:1.2!important;box-shadow:0 4px 18px #0008!important;visibility:visible!important;opacity:1!important;filter:none!important}
        .jaad-back:hover{background:#c91c16!important;color:#fff!important}
        .jaad-back:focus-visible{outline:3px solid #e5231b!important;outline-offset:3px!important}
        .jaad-shell{position:relative;width:min(100%,680px);margin:0 auto;flex:0 1 680px}
        .jaad-card{width:100%;overflow:hidden;box-sizing:border-box;background:#fff;border:1px solid #b91c1c99;border-radius:20px;display:grid;grid-template-columns:.9fr 1.1fr;box-shadow:0 24px 80px #0008;}
        .jaad-card-header{height:116px!important;min-height:116px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#09090b!important;padding:12px 24px!important;border-bottom:1px solid #242428!important;overflow:hidden!important;position:relative!important}
        .jaad-logo{display:block!important;width:132px!important;height:86px!important;max-width:100%!important;object-fit:contain!important;object-position:center!important;margin:0 auto!important;position:static!important;z-index:1!important;filter:drop-shadow(0 2px 10px #0008)!important}
        .jaad-card-body{box-sizing:border-box;padding:26px 30px 28px;background:#fff;color:#111114}
        .jaad-card-body h1{margin:0!important;text-align:center!important;color:#111114!important;font-size:25px!important;line-height:1.2!important;font-weight:800!important;letter-spacing:-.035em}
        .jaad-card-body .jaad-subtitle{margin:8px 0 0!important;text-align:center;color:#686872;font-size:11px;line-height:1.55}
        .jaad-card-body label:not(.jaad-remember){display:block;color:#555560;font-size:10px;font-weight:750;letter-spacing:.045em;margin-bottom:7px}
        .jaad-card-body input:not([type="checkbox"]),.jaad-card-body select{display:block;width:100%;min-width:0;box-sizing:border-box;border:1px solid #d8dbe2!important;border-radius:9px!important;background:#eaf1ff!important;padding:12px 13px!important;color:#111114!important;font-size:13px!important;line-height:1.35!important;outline:none;box-shadow:none!important}
        .jaad-card-body input:not([type="checkbox"]):focus,.jaad-card-body select:focus{border-color:#e5231b!important;box-shadow:0 0 0 3px #e5231b18!important}
        .jaad-card-body input[type="checkbox"]{accent-color:#16a34a;flex:0 0 auto}
        .jaad-card-body button:not(.jaad-secondary):not(.jaad-legal){box-sizing:border-box;min-height:43px;border:0;border-radius:9px;background:#e5231b;color:#fff;font-size:12px;font-weight:800;line-height:1.25;padding:12px 14px;cursor:pointer}
        .jaad-card-body button:not(.jaad-secondary):not(.jaad-legal):hover{background:#c91c16}
        .jaad-card-body button:disabled{opacity:.6;cursor:not-allowed}
        .jaad-card-body .jaad-secondary{display:block;width:100%;min-height:0!important;margin-top:12px!important;padding:7px 4px!important;border:0!important;background:transparent!important;color:#62626b!important;font-size:12px!important;font-weight:650!important}
        .jaad-card-body .jaad-secondary:hover{color:#e5231b!important}
        .jaad-card-body .jaad-legal{min-height:0!important;padding:0!important;background:transparent!important;color:inherit!important;border:0!important;font-size:inherit!important;font-weight:inherit!important;text-decoration:underline;cursor:pointer}
        .jaad-card-body .jaad-auth-error{margin:12px 0 0;color:#b91c1c;font-size:12px;line-height:1.5}
        .jaad-card-body .jaad-remember{display:flex!important;align-items:center;gap:8px;margin:16px 0 0!important;color:#62626b!important;font-size:11px!important;font-weight:500!important;letter-spacing:0!important}
        .jaad-card-body .jaad-turnstile{display:flex;justify-content:center;max-width:100%;overflow:hidden;margin-top:18px}
        .jaad-card-body .jaad-account-link{margin:20px 0 0;text-align:center;color:#62626b;font-size:12px;line-height:1.6}
        .jaad-card-body .jaad-account-link a{color:#e5231b;font-weight:700;text-decoration:underline}
        .jaad-legal-footer{margin:18px 0 0;text-align:center;color:#ffffffa6;font-size:11px;line-height:1.6}
        .jaad-legal-footer button{color:#fff;text-decoration:underline}

        .jaad-card-body .jaad-name-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .jaad-card-body .jaad-name-grid>div{min-width:0}
        .jaad-card-body .jaad-name-grid input{width:100%}
        .jaad-card-body .jaad-form-field{margin-top:22px}
        .jaad-card-body .jaad-form-stack{display:grid;gap:15px;margin-top:24px}
        @media(max-width:420px){.jaad-card-body .jaad-name-grid{grid-template-columns:1fr}}
        @media(max-width:520px){.jaad-auth-page{padding:84px 14px 28px}.jaad-back{left:14px!important;top:14px!important}.jaad-shell{width:100%;flex-basis:100%}.jaad-card-header{height:106px!important;min-height:106px!important;padding:10px 20px!important}.jaad-logo{width:122px!important;height:82px!important}.jaad-card-body{padding:24px 21px 25px}.jaad-card-body h1{font-size:23px!important}}

        .jaad-card-header{height:auto!important;min-height:410px!important;flex-direction:column!important;gap:14px!important;border-bottom:0!important;border-right:1px solid #991b1b88!important}
        .jaad-card-body{display:flex;flex-direction:column;justify-content:center;min-width:0}
        .jaad-card-header:after{content:"Secure customer access";position:absolute;top:calc(50% + 70px);left:0;right:0;text-align:center;color:#a1a1aa;font-size:12px}
        @media(max-width:640px){.jaad-card{grid-template-columns:1fr!important}.jaad-card-header{height:170px!important;min-height:170px!important;border-right:0!important;border-bottom:1px solid #991b1b88!important}.jaad-card-header:after{top:calc(50% + 48px);font-size:11px}.jaad-shell{width:min(100%,440px)}}
      `}</style>


      <Link
        href="/"
        className="jaad-back"
        aria-label="Back to website"
        style={{ position: "fixed", left: 20, top: 20, zIndex: 10000, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", border: "1px solid #ff6b64", borderRadius: 999, background: "#e5231b", color: "#ffffff", textDecoration: "none", fontSize: 13, fontWeight: 800, lineHeight: 1.2, boxShadow: "0 6px 24px rgba(0,0,0,.55)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to website
      </Link>

      <div className="jaad-shell">
        <div className="jaad-card">
          <div className="jaad-card-header" style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 132, height: 86, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Image src="/logo.png" alt="JAAD Logistics" width={132} height={86} className="jaad-logo" priority style={{ display: "block", width: 132, height: 86, objectFit: "contain", margin: 0, position: "static", transform: "none" }} />
            </div>
          </div>

          <div className="jaad-card-body">
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

                <label className="jaad-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#e5231b]"
                  />
                  Keep me signed in on this device
                </label>

                {process.env.NODE_ENV !== 'development' && (
                  <div className="jaad-turnstile">
                    <TurnstileBox
                      action="customer_login"
                      resetKey={captchaResetKey}
                      onToken={setCaptchaToken}
                    />
                  </div>
                )}
                {error && <p role="alert" className="jaad-auth-error">{error}</p>}

                <button
                  onClick={sendCode}
                  disabled={loading || cooldown > 0}
                  className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#e5231b] py-3.5 text-[13px] font-extrabold text-white transition hover:bg-[#c91c16] disabled:opacity-60"
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
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full rounded-full border-0 bg-[#ececec] px-5 py-3.5 text-center text-lg tracking-[.35em] outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]"
                  />
                </div>

                {error && <p role="alert" className="jaad-auth-error">{error}</p>}

                <button
                  onClick={verifyCode}
                  disabled={loading}
                  className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-[9px] bg-[#e5231b] py-3.5 text-[13px] font-extrabold text-white transition hover:bg-[#c91c16] disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={sendCode}
                  disabled={loading || cooldown > 0}
                  className="jaad-secondary"
                >
                  {cooldown > 0 ? `Request another code in ${cooldown}s` : 'Send a new code'}
                </button>
                <button
                  onClick={() => { setStep('email'); setCode(''); setError(null); }}
                  className="jaad-secondary"
                >
                  Use a different email
                </button>
              </>
            )}

            <p className="jaad-account-link">
              Don&apos;t have an account yet? <Link href="/customer/signup" className="font-semibold text-[#e5231b] underline">Create Account</Link>
            </p>
          </div>
        </div>

        <p className="jaad-legal-footer">
          By continuing, you agree to
          <br />
          <PolicyPdfLink title="Terms of Service" href="/documents/JAAD-LOGISTICS-Terms-of-Service.pdf" className="underline" /> and{' '}
          <PolicyPdfLink title="Privacy Policy" href="/documents/JAAD-LOGISTICS-Privacy-Policy.pdf" className="underline" />.
        </p>
      </div>
    </div>
  );
}
