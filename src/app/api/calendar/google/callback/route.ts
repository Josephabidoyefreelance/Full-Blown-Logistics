import { NextRequest, NextResponse } from 'next/server';
import { createGoogleOAuthClient, getSignedInUserAndSupabase } from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const stateCookie = request.cookies.get('jaad_google_calendar_state')?.value;
    if (!state || !stateCookie || state !== stateCookie) return NextResponse.redirect(new URL('/calendar?calendar_error=invalid_state', baseUrl));
    if (searchParams.get('error')) return NextResponse.redirect(new URL('/calendar?calendar_error=access_denied', baseUrl));
    if (!code) return NextResponse.redirect(new URL('/calendar?calendar_error=missing_code', baseUrl));

    const { supabase, user } = await getSignedInUserAndSupabase();
    if (!user) return NextResponse.redirect(new URL('/login?next=%2Fcalendar', baseUrl));
    const oauth = createGoogleOAuthClient();
    const { tokens } = await oauth.getToken(code);
    const { data: existing, error: readError } = await supabase.from('google_calendar_tokens').select('refresh_token').eq('user_id', user.id).maybeSingle();
    if (readError) throw new Error('Calendar token table is missing or unavailable. Run the supplied Supabase SQL file.');
    const row = {
      user_id: user.id,
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || existing?.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || null,
      updated_at: new Date().toISOString(),
    };
    if (!row.refresh_token) throw new Error('Google did not return a refresh token. Disconnect this app from your Google Account security settings, then connect again.');
    const { error: saveError } = await supabase.from('google_calendar_tokens').upsert(row, { onConflict: 'user_id' });
    if (saveError) throw saveError;
    const response = NextResponse.redirect(new URL('/calendar?calendar_connected=1', baseUrl));
    response.cookies.delete('jaad_google_calendar_state');
    return response;
  } catch (error) {
    console.error('Google Calendar OAuth callback failed:', error);
    const response = NextResponse.redirect(new URL(`/calendar?calendar_error=${encodeURIComponent(error instanceof Error ? error.message : 'connection_failed')}`, baseUrl));
    response.cookies.delete('jaad_google_calendar_state');
    return response;
  }
}
