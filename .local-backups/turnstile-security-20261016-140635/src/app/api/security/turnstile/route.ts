import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Cloudflare Turnstile secret is not configured on the server.' }, { status: 503 });
  }

  let body: { token?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid verification request.' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!token || !['admin_login', 'customer_login', 'customer_signup'].includes(action)) {
    return NextResponse.json({ success: false, error: 'Complete the security check and try again.' }, { status: 400 });
  }

  const form = new URLSearchParams({
    secret,
    response: token,
  });
  const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      return NextResponse.json({ success: false, error: 'Cloudflare could not verify this request. Please try again.' }, { status: 400 });
    }
    if (result.action && result.action !== action) {
      return NextResponse.json({ success: false, error: 'Security verification action did not match.' }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Cloudflare verification is temporarily unavailable.' }, { status: 502 });
  }
}
