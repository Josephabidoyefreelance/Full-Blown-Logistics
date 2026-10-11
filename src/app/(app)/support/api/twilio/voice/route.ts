import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function xml(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const callerId = process.env.TWILIO_CALLER_ID;

  if (!authToken || !callerId) {
    return xml('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Calling is not configured.</Say><Hangup/></Response>', 503);
  }

  const form = await request.formData();
  const to = String(form.get('To') ?? '').trim();

  // Only accept real telephone numbers; never allow arbitrary TwiML or client-controlled caller IDs.
  if (!/^\+?[1-9]\d{7,14}$/.test(to)) {
    return xml('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Enter a valid destination phone number in international format.</Say><Hangup/></Response>', 400);
  }

  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial({
    callerId,
    answerOnBridge: true,
    timeout: 30,
  });
  dial.number(to);

  return xml(response.toString());
}
