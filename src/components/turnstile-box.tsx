'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

type TurnstileAction = 'customer_login' | 'customer_signup';

export default function TurnstileBox({
  onToken,
  action,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  action: TurnstileAction;
  resetKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  // One effect owns the widget for its entire lifetime. Do not render/remove
  // from competing effects: this is particularly important in React Strict Mode.
  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let retryId: ReturnType<typeof setInterval> | undefined;
    let script: HTMLScriptElement | null = null;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetRef.current !== null) return;
      try {
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'light',
          size: 'normal',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        });
      } catch {
        onTokenRef.current('');
      }
    };

    if (!window.turnstile) {
      script = document.querySelector<HTMLScriptElement>('script[data-jaad-turnstile="true"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.jaadTurnstile = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderWidget);
      // A script may have finished loading before this component mounted.
      retryId = setInterval(() => {
        if (window.turnstile) {
          if (retryId) clearInterval(retryId);
          retryId = undefined;
          renderWidget();
        }
      }, 200);
    }
    renderWidget();

    return () => {
      cancelled = true;
      if (retryId) clearInterval(retryId);
      script?.removeEventListener('load', renderWidget);
      if (widgetRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetRef.current); } catch { /* widget already gone */ }
      }
      widgetRef.current = null;
      onTokenRef.current('');
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetKey === 0) return;
    onTokenRef.current('');
    if (widgetRef.current !== null && window.turnstile) {
      try { window.turnstile.reset(widgetRef.current); } catch { /* widget may be unmounted */ }
    }
  }, [resetKey]);

  if (!siteKey) {
    return <p style={{ fontSize: 12, color: '#b91c1c' }}>Cloudflare security check is not configured.</p>;
  }

  return (
    <div
      ref={containerRef}
      aria-label="Cloudflare security verification"
      style={{ minHeight: 65, width: '100%', display: 'flex', justifyContent: 'center' }}
    />
  );
}
