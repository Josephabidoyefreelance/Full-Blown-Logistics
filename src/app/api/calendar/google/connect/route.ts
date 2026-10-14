import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createGoogleOAuthClient, CALENDAR_SCOPE, getSignedInUserAndSupabase } from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await getSignedInUserAndSupabase();
    if (!user) return NextResponse.redirect(new URL('/login?next=%2Fcalendar', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    const state = randomBytes(32).toString('hex');
    const oauth = createGoogleOAuthClient();
    const url = oauth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', include_granted_scopes: true, scope: [CALENDAR_SCOPE], state });
    const response = NextResponse.redirect(url);
    response.cookies.set('jaad_google_calendar_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
    return response;
  } catch (error) {
    console.error('Google Calendar connect failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not start Google Calendar connection.' }, { status: 500 });
  }
}
