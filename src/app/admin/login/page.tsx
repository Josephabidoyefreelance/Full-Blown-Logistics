'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export default function AdminLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const captchaContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const requiresCaptcha = process.env.NODE_ENV !== 'development';

  const renderCaptcha = useCallback(() => {
    if (!siteKey || !captchaContainer.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(captchaContainer.current, {
      sitekey: siteKey,
      action: 'admin_login',
      theme: 'light',
      size: 'flexible',
      callback: (token: string) => { setCaptchaToken(token); setCaptchaError(''); },
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': () => { setCaptchaToken(''); setCaptchaError('Cloudflare check failed. Please try again.'); },
    });
  }, [siteKey]);

  useEffect(() => {
    if (!requiresCaptcha || !siteKey) return;
    if (window.turnstile) { renderCaptcha(); return; }
    const script = document.querySelector<HTMLScriptElement>('script[data-jaad-turnstile="true"]');
    if (script) {
      script.addEventListener('load', renderCaptcha);
      return () => script.removeEventListener('load', renderCaptcha);
    }
    const el = document.createElement('script');
    el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    el.async = true; el.defer = true; el.dataset.jaadTurnstile = 'true'; el.onload = renderCaptcha;
    el.onerror = () => setCaptchaError('Cloudflare could not load. Check your site key and internet connection.');
    document.head.appendChild(el);
    return () => { el.onload = null; };
  }, [siteKey, renderCaptcha, requiresCaptcha]);

  useEffect(() => () => {
    if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!authorized) { setError('Confirm that you are authorized to access the admin portal.'); return; }
    if (requiresCaptcha && !siteKey) { setError('Cloudflare is not configured.'); return; }
    if (requiresCaptcha && !captchaToken) { setError('Complete the Cloudflare security check first.'); return; }
    setLoading(true);
    try {
      if (requiresCaptcha) {
      const verify = await fetch('/api/security/turnstile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken, action: 'admin_login' }),
      });
      const check = await verify.json().catch(() => ({}));
      if (!verify.ok || !check.success) {
        setError(check.error || 'Cloudflare could not verify this request. Please try again.');
        if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
        setCaptchaToken('');
        return;
      }
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        console.error('JAAD admin Supabase authentication failed:', { code: authError.code, status: authError.status, message: authError.message });
        setError(authError.message || 'Sign-in failed. Check your email and password.');
        return;
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setError('Sign-in succeeded, but your session is not ready. Please try again.');
        return;
      }
      const checkResponse = await fetch('/api/admin/session-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
        cache: 'no-store',
      });
      if (!checkResponse.ok) {
        const checkResult = await checkResponse.json().catch(() => ({}));
        setError(typeof checkResult.error === 'string' ? checkResult.error : 'Administrator verification failed.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to complete sign-in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-[#18181b] flex items-center justify-center px-4 py-12 relative" style={{backgroundImage:'radial-gradient(circle at 85% 5%,rgba(180,20,30,.20),transparent 40%)'}}>
      <Link href="/" className="absolute left-5 top-5 rounded-full border border-red-500 bg-red-600 px-4 py-2 text-xs font-bold !text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500" style={{ backgroundColor: "#dc2626", color: "#ffffff" }}>← Back to website</Link>
      <div className="w-full max-w-[680px] overflow-hidden rounded-[20px] border border-red-600/60 bg-white shadow-[0_24px_100px_rgba(0,0,0,.65)] grid grid-cols-1 md:grid-cols-[.9fr_1.1fr]">
        <section className="bg-[#09090b] min-h-[180px] md:min-h-[410px] flex flex-col items-center justify-center gap-3 p-6 border-b md:border-b-0 md:border-r border-red-700/50">
          <div className="h-24 w-36 relative flex items-center justify-center">
            <Image src="/logo.png" alt="JAAD Logistics" width={144} height={88} priority className="h-[88px] w-[144px] object-contain" />
          </div>
          <div className="text-center"><p className="text-zinc-400 text-xs mt-2">Secure platform administration</p></div>
          <div className="hidden md:block w-14 h-[2px] bg-red-600" />
          <p className="hidden md:block text-zinc-500 text-xs text-center max-w-[240px]">Private access for authorized JAAD administrators.</p>
        </section>
        <section className="px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">
          <p className="text-red-600 text-[11px] font-bold tracking-[.16em] uppercase">Administrator portal</p>
          <h1 className="text-[26px] font-extrabold tracking-tight mt-2">Sign in</h1>
          <p className="text-zinc-500 text-sm mt-2">Access your JAAD management dashboard.</p>
          <form onSubmit={signIn} className="mt-5 space-y-4">
            <div><label htmlFor="admin-email" className="block text-xs font-bold mb-2">Email address</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" placeholder="Admin email" /></div>
            <div><div className="flex items-center justify-between mb-2"><label htmlFor="admin-password" className="text-xs font-bold">Password</label></div><div className="relative"><input id="admin-password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 pr-16 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" placeholder="Enter your password" /><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 hover:text-red-600">{showPassword?'Hide':'Show'}</button></div></div>
            <label className="flex items-start gap-2 text-xs text-zinc-600 cursor-pointer"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)} className="mt-0.5 accent-red-600" />I confirm I am authorized to access the JAAD administration portal.</label>
            {requiresCaptcha && (siteKey ? <div ref={captchaContainer} className="min-h-[65px]" /> : <p role="alert" className="text-xs text-red-700">Cloudflare site key is missing.</p>)}
            {requiresCaptcha && captchaError && <p role="alert" className="text-xs text-red-700">{captchaError}</p>}
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{loading?'Signing in…':'Sign in to JAAD →'}</button>
          </form>
          <p className="text-xs text-center mt-3"><Link href="/admin/forgot-password" className="text-red-600 underline hover:text-red-700">Forgot password?</Link></p>
          <p className="text-xs text-zinc-500 mt-5 text-center">JAAD internal administration only</p>
        </section>
      </div>
    </main>
  );
}
