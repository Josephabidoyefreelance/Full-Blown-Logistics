import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { encryptGmailToken } from '@/lib/gmail-token';

export const runtime = 'nodejs';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is not configured.');
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const googleError = requestUrl.searchParams.get('error');
  const cookieStore = await cookies();
  const expectedState = cookieStore.get('jaad_gmail_oauth_state')?.value;
  cookieStore.delete('jaad_gmail_oauth_state');

  if (googleError) return NextResponse.redirect(new URL(`/support?view=email&gmail_error=${encodeURIComponent(googleError)}`, request.url));
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/support?view=email&gmail_error=invalid_state', request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=%2Fsupport%3Fview%3Demail', request.url));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/support?view=email&gmail_error=missing_google_config', request.url));
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      cache: 'no-store',
    });
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
    if (!tokenResponse.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || 'Google token exchange failed.');

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store',
    });
    const profile = await profileResponse.json() as { email?: string };
    if (!profileResponse.ok || !profile.email) throw new Error('Could not identify the connected Gmail account.');

    const admin = adminClient();
    const { data: existing, error: readError } = await admin.from('gmail_connections').select('encrypted_refresh_token').eq('user_id', user.id).maybeSingle();
    if (readError) throw readError;
    const refreshToken = tokens.refresh_token;
    const encrypted = refreshToken ? encryptGmailToken(refreshToken) : existing?.encrypted_refresh_token;
    if (!encrypted) throw new Error('Google did not return a refresh token. Remove this app from your Google Account permissions and connect again.');

    const { error: saveError } = await admin.from('gmail_connections').upsert({
      user_id: user.id,
      gmail_address: profile.email.toLowerCase(),
      encrypted_refresh_token: encrypted,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saveError) throw saveError;
    return NextResponse.redirect(new URL('/support?view=email&gmail_connected=1', request.url));
  } catch (error) {
    console.error('Gmail OAuth callback failed:', error);
    return NextResponse.redirect(new URL('/support?view=email&gmail_error=connection_failed', request.url));
  }
}
