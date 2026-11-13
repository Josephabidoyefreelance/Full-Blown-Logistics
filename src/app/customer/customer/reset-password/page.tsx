'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import PolicyPdfLink from '@/components/PolicyPdfLink';
import TurnstileBox from '@/components/turnstile-box';

type ResetStep = 'details' | 'sent' | 'checking' | 'verified' | 'complete';

function getErrorMessage(error: unknown, fallback: string) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message : fallback;
}

export default function CustomerResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<ResetStep>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  // A Supabase recovery link signs in the recipient specifically for password recovery.
  // A normal existing session alone must not unlock this form.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromRecoveryLink = url.searchParams.has('code') ||
      /(?:^|[&#])(?:access_token|type=recovery)=/.test(url.hash);
    if (!fromRecoveryLink) return;

    let current = true;
    let recovered = false;
    setStep('checking');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user && current) {
        recovered = true;
        setError(null);
        setStep('verified');
      }
    });

    // SSR/browser Supabase clients may exchange the redirect code during initialization,
    // before the PASSWORD_RECOVERY listener receives the event. Recognize only a link
    // landing (code/token URL), never an arbitrary signed-in page visit.
    async function finishLink() {
      try {
        const { data: sessionInfo } = await supabase.auth.getSession();
        if (!current || recovered) return;
        if (sessionInfo.session?.user && fromRecoveryLink) {
          recovered = true;
          setError(null);
          setStep('verified');
          return;
        }
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!current || recovered) return;
          if (!exchangeError && data.user) {
            recovered = true;
            setError(null);
            setStep('verified');
            return;
          }
        }
        if (current && !recovered) {
          setError('This reset link is invalid or expired. Request a new link.');
          setStep('details');
        }
      } catch {
        if (current && !recovered) {
          setError('The reset link could not be verified. Request a new one.');
          setStep('details');
        }
      }
    }
    void finishLink();
    return () => { current = false; subscription.unsubscribe(); };
  }, [supabase]);

  async function verifyTurnstile(): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') return true;
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !captchaToken) {
      setError('Complete the Cloudflare security check first.');
      return false;
    }
    try {
      const response = await fetch('/api/security/turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken, action: 'customer_login' }),
      });
      const check = await response.json().catch(() => ({}));
      setCaptchaToken('');
      setCaptchaResetKey((key) => key + 1);
      if (!response.ok || !check.success) {
        setError('Security verification failed. Please retry.');
        return false;
      }
      return true;
    } catch {
      setError('Could not complete the security check.');
      return false;
    }
  }

  async function requestResetLink() {
    if (loading) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password !== confirmation) {
      setError('Enter matching new passwords with at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (!(await verifyTurnstile())) return;
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/customer/reset-password`,
      });
      if (sendError) {
        setError(getErrorMessage(sendError, 'Could not request a reset link.'));
        return;
      }
      // Do not persist a new password while the user moves through email.
      setPassword('');
      setConfirmation('');
      setStep('sent');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not request a reset link.'));
    } finally {
      setLoading(false);
    }
  }

  async function saveVerifiedPassword() {
    if (loading || step !== 'verified') return;
    if (password.length < 8 || password !== confirmation) {
      setError('Enter matching new passwords with at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Your recovery session expired. Request a new link.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(getErrorMessage(updateError, 'Could not update your password.'));
        return;
      }
      setPassword('');
      setConfirmation('');
      await supabase.auth.signOut({ scope: 'local' });
      window.history.replaceState({}, '', '/customer/reset-password');
      setStep('complete');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not finish password reset.'));
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = 'w-full rounded-full border-0 bg-[#ececec] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]';
  const toggleClass = 'jaad-password-toggle absolute right-3 top-1/2 -translate-y-1/2 rounded bg-transparent px-2 py-1 text-xs font-semibold text-[#62626b] hover:text-[#e5231b]';

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
        .jaad-card-body button:not(.jaad-secondary):not(.jaad-legal):not(.jaad-password-toggle){box-sizing:border-box;min-height:43px;border:0;border-radius:9px;background:#e5231b;color:#fff;font-size:12px;font-weight:800;line-height:1.25;padding:12px 14px;cursor:pointer}
        .jaad-card-body button:not(.jaad-secondary):not(.jaad-legal):not(.jaad-password-toggle):hover{background:#c91c16}
        .jaad-card-body button:disabled{opacity:.6;cursor:not-allowed}
        .jaad-card-body button.jaad-password-toggle{position:absolute!important;right:12px!important;top:50%!important;transform:translateY(-50%)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-height:0!important;height:auto!important;padding:6px 8px!important;margin:0!important;background:transparent!important;border:0!important;border-radius:5px!important;box-shadow:none!important;color:#62626b!important;font-size:12px!important;font-weight:650!important;line-height:1.25!important;cursor:pointer!important}
        .jaad-card-body button.jaad-password-toggle:hover{background:transparent!important;color:#e5231b!important}
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
      <Link href="/" className="jaad-back" aria-label="Back to website">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back to website
      </Link>
      <div className="jaad-shell">
        <div className="jaad-card">
          <div className="jaad-card-header" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Image src="/logo.png" alt="JAAD Logistics" width={132} height={86} className="jaad-logo" priority />
          </div>
          <div className="jaad-card-body">
            <h1>Reset Password</h1>
            {step === 'complete' ? (
              <>
                <p role="status" className="mt-5 text-center text-[13px] font-semibold text-green-700">Password reset successful. Sign in with your new password and verify the usual email code.</p>
                <p className="jaad-account-link"><Link href="/customer/login">Return to Sign In</Link></p>
              </>
            ) : step === 'sent' ? (
              <>
                <p role="status" className="jaad-subtitle">If an account exists for {email.trim()}, a password reset link has been sent. Open the link in your email, then enter your new password on the page that opens.</p>
                <button type="button" className="jaad-secondary" onClick={() => { setError(null); setStep('details'); }}>Request another link</button>
                <p className="jaad-account-link"><Link href="/customer/login">Back to Sign In</Link></p>
              </>
            ) : step === 'checking' ? (
              <p role="status" className="jaad-subtitle">Verifying your email reset link...</p>
            ) : (
              <>
                <p className="jaad-subtitle">
                  {step === 'verified'
                    ? 'Email link verified. Enter your new password and confirm it to complete the reset.'
                    : 'Enter your email and a new password. We will send a secure link to verify the reset. For security, enter the password again when you return from your email.'}
                </p>
                <div className="jaad-form-stack">
                  {step === 'details' && (
                    <div>
                      <label htmlFor="reset-account-email">Email address</label>
                      <input id="reset-account-email" type="email" autoComplete="email" className={fieldStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label htmlFor="reset-new-password">New password</label>
                    <div className="relative">
                      <input id="reset-new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={fieldStyle + ' pr-20'} value={password} onChange={(e) => setPassword(e.target.value)} />
                      <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className={toggleClass} onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reset-confirm-password">Confirm new password</label>
                    <div className="relative">
                      <input id="reset-confirm-password" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" className={fieldStyle + ' pr-20'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
                      <button type="button" aria-label={showConfirmation ? 'Hide password confirmation' : 'Show password confirmation'} aria-pressed={showConfirmation} className={toggleClass} onClick={() => setShowConfirmation((v) => !v)}>{showConfirmation ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                  {step === 'details' && process.env.NODE_ENV !== 'development' && (
                    <div className="jaad-turnstile"><TurnstileBox action="customer_login" resetKey={captchaResetKey} onToken={setCaptchaToken} /></div>
                  )}
                </div>
                {error && <p className="jaad-auth-error" role="alert">{error}</p>}
                <button type="button" className="mt-6 flex w-full justify-center" disabled={loading} onClick={step === 'details' ? requestResetLink : saveVerifiedPassword}>
                  {loading ? 'Please wait...' : step === 'details' ? 'Email Reset Link' : 'Reset Password'}
                </button>
                <p className="jaad-account-link">Remember your password? <Link href="/customer/login">Sign In</Link></p>
              </>
            )}
            {error && (step === 'checking' || step === 'sent') && <p className="jaad-auth-error" role="alert">{error}</p>}
          </div>
        </div>
        <p className="jaad-legal-footer">
          By continuing, you agree to<br />
          <PolicyPdfLink title="Terms of Service" href="/documents/JAAD-LOGISTICS-Terms-of-Service.pdf" className="underline" /> and{' '}
          <PolicyPdfLink title="Privacy Policy" href="/documents/JAAD-LOGISTICS-Privacy-Policy.pdf" className="underline" />.
        </p>
      </div>
    </div>
  );
}
