'use client';

import { useCallback, useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export default function TurnstileBox({
  onToken,
  action,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  action: 'customer_login' | 'customer_signup';
  resetKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const render = useCallback(() => {
    if (!siteKey || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      action,
      theme: 'light',
      size: 'flexible',
      callback: (token: string) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(''),
      'error-callback': () => onTokenRef.current(''),
    });
  }, [siteKey, action]);

  useEffect(() => {
    if (!siteKey) return;
    if (window.turnstile) { render(); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-jaad-turnstile="true"]');
    if (existing) {
      existing.addEventListener('load', render);
      return () => existing.removeEventListener('load', render);
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true; script.dataset.jaadTurnstile = 'true'; script.onload = render;
    document.head.appendChild(script);
    return () => { script.onload = null; };
  }, [siteKey, render]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) {
      window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    }
    if (container.current) container.current.innerHTML = '';
    render();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [resetKey, render]);

  if (!siteKey) return <p style={{fontSize:12,color:'#b91c1c'}}>Cloudflare security check is not configured.</p>;
  return <div ref={container} aria-label="Cloudflare security verification" style={{minHeight:65,width:'100%',display:'flex',justifyContent:'center'}} />;
}
