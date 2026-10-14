import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function xml(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function publicBaseUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host && !host.includes('localhost') && !host.startsWith('127.0.0.1')) {
    return `${proto}://${host}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const callerId = process.env.TWILIO_CALLER_ID;

  if (!authToken || !callerId) {
    return xml('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Calling is not configured.</Say><Hangup/></Response>', 503);
  }

  const form = await request.formData();
  const to = String(form.get('To') ?? '').trim();

  if (!/^\+?[1-9]\d{7,14}$/.test(to)) {
    return xml('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Enter a valid destination phone number in international format.</Say><Hangup/></Response>', 400);
  }

  const baseUrl = publicBaseUrl(request);
  if (!baseUrl) {
    return xml('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Call status updates require a public application URL. Please use the deployed JAAD application.</Say><Hangup/></Response>', 503);
  }

  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial({
    callerId,
    answerOnBridge: true,
    timeout: 30,
    action: `${baseUrl}/api/twilio/status`,
    method: 'POST',
  });

  // Twilio sends DialCallStatus (completed, busy, no-answer, failed, etc.)
  // to the action URL after the destination leg ends.
  dial.number(to);

  return xml(response.toString());
}
