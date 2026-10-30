import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

const VALID_ACTIONS = new Set([
  'admin_login',
  'customer_login',
  'customer_signup',
]);

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function POST(request: NextRequest) {
  const secret =
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET;

  if (!secret) {
    console.error('Turnstile server secret is not configured.');
    return jsonError(
      'Security verification is temporarily unavailable.',
      503,
    );
  }

  let body: { token?: unknown; action?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid verification request.', 400);
  }

  const token =
    typeof body.token === 'string' ? body.token.trim() : '';
  const action =
    typeof body.action === 'string' ? body.action : '';

  if (!token || token.length > 4096) {
    return jsonError(
      'Complete the Cloudflare security check and try again.',
      400,
    );
  }

  if (!VALID_ACTIONS.has(action)) {
    return jsonError('Invalid security-check action.', 400);
  }

  const form = new URLSearchParams({
    secret,
    response: token,
  });

  let result: TurnstileResult;

  try {
    const verification = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!verification.ok) {
      console.error(
        'Turnstile Siteverify returned HTTP status:',
        verification.status,
      );
      return jsonError(
        'Cloudflare verification is temporarily unavailable. Please try again.',
        502,
      );
    }

    result = (await verification.json()) as TurnstileResult;
  } catch (error) {
    console.error(
      'Turnstile Siteverify request failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return jsonError(
      'Cloudflare verification is temporarily unavailable. Please try again.',
      502,
    );
  }

  if (!result.success) {
    const codes = Array.isArray(result['error-codes'])
      ? result['error-codes'].filter(
          (code): code is string => typeof code === 'string',
        )
      : [];

    console.warn('Turnstile verification rejected:', codes);

    return jsonError(
      'Cloudflare could not verify this request. Please try again.',
      400,
    );
  }

  const hostname =
    typeof result.hostname === 'string'
      ? result.hostname.toLowerCase().replace(/\.$/, '')
      : '';

  // Localhost is accepted only in local development.
  // Production accepts the live domains and the named Vercel preview hostname.
  const allowedHostnames =
    process.env.NODE_ENV === 'development'
      ? new Set(['localhost'])
      : new Set([
          'jaadlogistics.com',
          'www.jaadlogistics.com',
          'full-blown-logistics.vercel.app',
        ]);

  if (!hostname || !allowedHostnames.has(hostname)) {
    console.warn('Turnstile hostname rejected:', hostname || '(missing)');
    return jsonError(
      'This website hostname is not authorized for verification.',
      400,
    );
  }

  // The widget must send the exact action expected by this endpoint.
  if (result.action !== action) {
    console.warn('Turnstile action mismatch:', {
      expected: action,
      received: result.action ?? null,
    });

    return jsonError(
      'Security verification did not match this page. Please try again.',
      400,
    );
  }

  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}