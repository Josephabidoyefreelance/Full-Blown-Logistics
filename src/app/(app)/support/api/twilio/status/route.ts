import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Basic callback endpoint for Twilio call lifecycle events.
// Detailed persistence can be added after confirming the existing support_calls schema.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const callStatus = String(form.get('CallStatus') ?? 'unknown');
  const callSid = String(form.get('CallSid') ?? '');
  console.info('Twilio call status callback', { callStatus, callSid: callSid ? `${callSid.slice(0, 8)}…` : '' });
  return NextResponse.json({ received: true });
}
