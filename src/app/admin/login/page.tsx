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
    if (!siteKey) return;
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
  }, [siteKey, renderCaptcha]);

  useEffect(() => () => {
    if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!authorized) { setError('Confirm that you are authorized to access the admin portal.'); return; }
    if (!siteKey) { setError('Cloudflare is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY.'); return; }
    if (!captchaToken) { setError('Complete the Cloudflare security check first.'); return; }
    setLoading(true);
    try {
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
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) { setError('Sign-in failed. Check your email and password.'); return; }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to complete sign-in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="jaad-auth-page">
      <style jsx>{`
        .jaad-auth-page{min-height:100svh;display:flex;align-items:center;justify-content:center;position:relative;overflow:auto;padding:92px 18px 36px;background:radial-gradient(ellipse at 84% 8%,rgba(143,22,25,.42),transparent 42%),radial-gradient(ellipse at 12% 90%,rgba(36,36,40,.25),transparent 42%),#09090b;color:#111114}
        .jaad-back{position:fixed!important;left:20px!important;top:20px!important;z-index:10000!important;display:inline-flex!important;align-items:center!important;gap:8px!important;padding:10px 15px!important;border:1px solid #ff6b64!important;border-radius:999px!important;background:#e5231b!important;color:#fff!important;text-decoration:none!important;font-size:13px!important;font-weight:800!important;line-height:1.2!important;box-shadow:0 4px 18px #0008!important;visibility:visible!important;opacity:1!important;filter:none!important}
        .jaad-back:hover{background:#c91c16!important;color:#fff!important}
        .jaad-back:focus-visible{outline:3px solid #e5231b!important;outline-offset:3px!important}
        .jaad-card{position:relative;z-index:1;width:min(100%,430px);background:#fff;border:1px solid #e3e3e7;border-radius:22px;box-shadow:0 24px 80px #0008;padding:0 0 27px;display:flex;flex-direction:column;overflow:hidden}
        .jaad-logo{display:block!important;object-fit:contain!important;object-position:center!important;margin:0 auto!important;width:132px!important;height:86px!important;max-width:100%!important;object-fit:contain!important;object-position:center!important;margin:0 auto!important;position:relative!important;z-index:1!important;filter:drop-shadow(0 2px 10px #0008)!important}
        .jaad-card-header{height:116px!important;min-height:116px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#09090b!important;padding:12px 24px!important;border-bottom:1px solid #242428!important;overflow:hidden!important;position:relative!important}
        .jaad-card-content{padding:26px 32px 0}
        .jaad-eyebrow{font-size:9px;letter-spacing:.2em;font-weight:800;text-transform:uppercase;color:#e5231b;text-align:center;margin:0}
        .jaad-heading{font-size:25px;line-height:1.15;letter-spacing:-.035em;font-weight:850;text-align:center;margin:8px 0 0;color:#111114}
        .jaad-subtitle{font-size:11px;line-height:1.55;color:#686872;text-align:center;margin:8px 0 0}
        .jaad-label{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#62626b;margin:0 0 7px}
        .jaad-input{width:100%;box-sizing:border-box;border:1px solid #d8dbe2;border-radius:10px;background:#eaf1ff;padding:12px;font-size:12px;color:#111114;outline:none}
        .jaad-input:focus{border-color:#e5231b;box-shadow:0 0 0 3px #e5231b18}
        .jaad-submit{width:100%;border:0;border-radius:9px;background:#e5231b;color:#fff;font-weight:800;font-size:12px;padding:13px;cursor:pointer;transition:background .2s}
        .jaad-submit:hover{background:#c91c16}
        .jaad-submit:disabled{opacity:.6;cursor:not-allowed}
        .jaad-foot{font-size:10px;line-height:1.5;text-align:center;color:#62626b;margin:17px 0 0}
        @media(max-width:480px){.jaad-auth-page{padding:84px 14px 24px}.jaad-card{padding:0 0 23px;border-radius:19px}.jaad-card-content{padding:24px 22px 0}.jaad-card-header{height:106px!important;min-height:106px!important;padding:10px 20px!important}.jaad-logo{width:122px!important;height:82px!important}.jaad-heading{font-size:23px}.jaad-back{left:14px!important;top:14px!important}}
      `}</style>
      <Link href="/" className="jaad-back" aria-label="Back to website" style={{ position: "fixed", left: 20, top: 20, zIndex: 10000, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", border: "1px solid #ff6b64", borderRadius: 999, background: "#e5231b", color: "#ffffff", textDecoration: "none", fontSize: 13, fontWeight: 800, lineHeight: 1.2, boxShadow: "0 6px 24px rgba(0,0,0,.55)" }}>← <span>Back to website</span></Link>
      <section className="jaad-card" aria-labelledby="admin-login-title">
        <div className="jaad-card-header"><Image src="/logo.png" alt="JAAD Logistics" width={156} height={116} className="jaad-logo" priority /></div>
        <div className="jaad-card-content">
        <p className="jaad-eyebrow">Staff only</p>
        <h1 id="admin-login-title" className="jaad-heading">Sign in to administration</h1>
        <p className="jaad-subtitle">Secure access for authorised JAAD Logistics staff.</p>
        <form onSubmit={signIn} style={{display:'grid',gap:15,marginTop:24}}>
          <div><label className="jaad-label" htmlFor="admin-email">Email</label><input className="jaad-input" id="admin-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div><label className="jaad-label" htmlFor="admin-password">Password</label><div style={{position:'relative'}}><input className="jaad-input" id="admin-password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={{paddingRight:55}}/><button type="button" onClick={()=>setShowPassword(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#62626b',background:'transparent',border:0,cursor:'pointer'}}>{showPassword?'Hide':'Show'}</button></div></div>
          <label style={{display:'flex',gap:7,alignItems:'center',fontSize:10.5,color:'#62626b'}}><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)} style={{accentColor:'#16a34a'}}/>I confirm I am authorized to access the admin portal.</label>
          {siteKey ? <div ref={captchaContainer} style={{minHeight:65}} /> : <p style={{fontSize:11,color:'#b91c1c',margin:0}}>Cloudflare site key is missing from the environment.</p>}
          {captchaError && <p role="alert" style={{fontSize:11,color:'#b91c1c',margin:0}}>{captchaError}</p>}
          {error && <p role="alert" style={{fontSize:11,color:'#b91c1c',margin:0}}>{error}</p>}
          <button className="jaad-submit" type="submit" disabled={loading}>{loading?'Checking…':'Continue as admin →'}</button>
        </form>
        <p className="jaad-foot">Admin accounts are provisioned by an administrator.</p>
        </div>
      </section>
    </main>
  );
}
