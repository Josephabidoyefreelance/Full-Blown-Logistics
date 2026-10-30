import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in before placing calls.' }, { status: 401 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return NextResponse.json({ error: 'Twilio is not fully configured on the server.' }, { status: 503 });
    }

    const identity = `jaad_${user.id.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 48)}`;
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity,
      ttl: 3600,
    });

    token.addGrant(new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    }));

    return NextResponse.json({ token: token.toJwt(), identity });
  } catch (error) {
    console.error('Twilio token error:', error);
    return NextResponse.json({ error: 'Could not create a calling session.' }, { status: 500 });
  }
}
