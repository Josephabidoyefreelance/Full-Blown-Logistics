import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

function errorResponse(message: string, status: number, code: string, hostname?: string) {
  return NextResponse.json(
    { success: false, error: message, code, ...(hostname ? { hostname } : {}) },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  // Local development only: bypass Turnstile while the portal is being built.
  // Production always performs the full Cloudflare Siteverify check below.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.error('Turnstile configuration error: no server secret environment variable is set.');
    return errorResponse(
      'Cloudflare server secret is not configured. Add TURNSTILE_SECRET (or TURNSTILE_SECRET_KEY) to .env.local, then restart the development server.',
      503,
      'missing-server-secret'
    );
  }

  let body: { token?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('The verification request was not valid JSON. Refresh the page and try again.', 400, 'invalid-json');
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!token) {
    return errorResponse('Cloudflare has not provided a verification token. Complete the checkbox again.', 400, 'missing-token');
  }
  if (!['admin_login', 'customer_login', 'customer_signup'].includes(action)) {
    return errorResponse('The login page sent an unrecognized security-check action.', 400, 'invalid-action');
  }

  const form = new URLSearchParams({ secret, response: token });
  // The client IP is optional; don't trust or require it for local development.

  let result: TurnstileResult;
  try {
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!verification.ok) {
      console.error('Turnstile Siteverify HTTP failure:', verification.status);
      return errorResponse('Cloudflare verification service returned an HTTP error. Please try again.', 502, 'siteverify-http-error');
    }
    result = (await verification.json()) as TurnstileResult;
  } catch (error) {
    console.error('Turnstile Siteverify request failed:', error instanceof Error ? error.message : 'Unknown network error');
    return errorResponse('The server could not reach Cloudflare. Check the internet connection/firewall and try again.', 502, 'siteverify-network-error');
  }

  const codes = Array.isArray(result['error-codes'])
    ? result['error-codes'].filter((value): value is string => typeof value === 'string')
    : [];
  const code = codes.join(',') || 'verification-failed';
  const hostname = typeof result.hostname === 'string' ? result.hostname : undefined;

  if (!result.success) {
    console.warn('Turnstile verification rejected:', { codes, hostname: hostname ?? null, action: result.action ?? null });

    if (codes.includes('missing-input-secret') || codes.includes('invalid-input-secret')) {
      return errorResponse('Cloudflare rejected the server secret. In Cloudflare Turnstile, copy the Secret key for the same widget as the Site key used by this app. Update TURNSTILE_SECRET in .env.local and restart the server.', 400, code, hostname);
    }
    if (codes.includes('missing-input-response')) {
      return errorResponse('The browser did not send a Cloudflare token. Complete the checkbox again.', 400, code, hostname);
    }
    if (codes.includes('invalid-input-response') || codes.includes('timeout-or-duplicate')) {
      return errorResponse('Cloudflare rejected or expired the token. Refresh the page and complete the checkbox again. Confirm localhost is allowed for this widget, and that the browser Site key and server Secret key belong to the same widget.', 400, code, hostname);
    }
    if (codes.includes('bad-request')) {
      return errorResponse('Cloudflare rejected the verification request format. The server verification configuration needs review.', 400, code, hostname);
    }
    return errorResponse(`Cloudflare rejected the token (${code}). Check the matching Site key/Secret key pair and allowed hostname in Cloudflare Turnstile.`, 400, code, hostname);
  }

  if (result.action && result.action !== action) {
    return errorResponse('Cloudflare verified a different action than the page requested. Refresh and try again.', 400, 'action-mismatch', hostname);
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
