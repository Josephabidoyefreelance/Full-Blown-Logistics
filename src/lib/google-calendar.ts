import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_TABLE = 'google_calendar_tokens';

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/google/callback`;
  if (!clientId || !clientSecret) throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local.');
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getSignedInUserAndSupabase() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function getCalendarClientForCurrentUser() {
  const { supabase, user } = await getSignedInUserAndSupabase();
  if (!user) return { response: Response.json({ error: 'Please sign in to use Google Calendar.' }, { status: 401 }) } as const;

  const { data: tokenRow, error } = await supabase.from(TOKEN_TABLE)
    .select('access_token, refresh_token, expiry_date, scope')
    .eq('user_id', user.id).maybeSingle();
  if (error) {
    console.error('Google Calendar token lookup failed:', error);
    return { response: Response.json({ error: 'Calendar token storage is not ready. Run the supplied SQL setup in Supabase.' }, { status: 500 }) } as const;
  }
  if (!tokenRow?.refresh_token && !tokenRow?.access_token) {
    return { response: Response.json({ connected: false, error: 'Connect Google Calendar first.' }, { status: 401 }) } as const;
  }

  const oauth = createGoogleOAuthClient();
  oauth.setCredentials({ access_token: tokenRow.access_token || undefined, refresh_token: tokenRow.refresh_token || undefined, expiry_date: tokenRow.expiry_date || undefined, scope: tokenRow.scope || undefined });
  oauth.on('tokens', async (tokens) => {
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.access_token = tokens.access_token;
    if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) update.expiry_date = tokens.expiry_date;
    if (tokens.scope) update.scope = tokens.scope;
    if (Object.keys(update).length) {
      const { error: saveError } = await supabase.from(TOKEN_TABLE).update(update).eq('user_id', user.id);
      if (saveError) console.error('Could not refresh saved Google Calendar tokens:', saveError.message);
    }
  });
  return { calendar: google.calendar({ version: 'v3', auth: oauth }), supabase, user } as const;
}
