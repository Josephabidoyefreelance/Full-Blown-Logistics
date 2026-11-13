'use client';

import { useEffect, useRef } from 'react';

type TurnstileRenderOptions = {
  sitekey: string;
  action: 'customer_login' | 'customer_signup';
  theme: 'light';
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile can only load in the browser.'));
  }

  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-jaad-turnstile="true"]',
    );

    const handleLoad = () => {
      if (window.turnstile) {
        resolve();
      } else {
        turnstileScriptPromise = null;
        reject(new Error('Cloudflare Turnstile loaded without its API.'));
      }
    };

    const handleError = () => {
      turnstileScriptPromise = null;
      reject(new Error('Could not load the Cloudflare Turnstile script.'));
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.jaadTurnstile = 'true';
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
      return;
    }

    // If another component inserted the script, wait for it. If it has already
    // loaded, the API check above would have returned before reaching this point.
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
  });

  return turnstileScriptPromise;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const previousResetKeyRef = useRef(resetKey);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let renderedWidgetId: string | null = null;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        // Guard against accidental duplicate rendering into the same container.
        if (widgetIdRef.current) return;

        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'light',
          size: 'flexible',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        });

        renderedWidgetId = id;
        widgetIdRef.current = id;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error(
            'Unable to initialize Cloudflare Turnstile:',
            error instanceof Error ? error.message : 'Unknown error',
          );
          onTokenRef.current('');
        }
      });

    return () => {
      cancelled = true;
      if (renderedWidgetId && window.turnstile) {
        window.turnstile.remove(renderedWidgetId);
        if (widgetIdRef.current === renderedWidgetId) widgetIdRef.current = null;
      }
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;

    const widgetId = widgetIdRef.current;
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
    onTokenRef.current('');
  }, [resetKey]);

  if (!siteKey) {
    return (
      <p style={{ fontSize: 12, color: '#b91c1c' }}>
        Cloudflare security check is not configured.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label="Cloudflare security verification"
      style={{
        minHeight: 65,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    />
  );
}
