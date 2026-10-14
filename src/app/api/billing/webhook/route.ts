import { NextResponse } from 'next/server';
import { verifyAndActivateBankTransfer, verifyPaystackSignature } from '@/lib/billing/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');
  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Paystack signature.' }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  // Ignore other signed events. Only a verified successful charge can activate a package.
  if (event.event !== 'charge.success') return NextResponse.json({ received: true });
  const reference = event.data?.reference;
  if (!reference) return NextResponse.json({ error: 'The successful charge has no reference.' }, { status: 400 });

  const result = await verifyAndActivateBankTransfer(reference);
  if (result.ok) return NextResponse.json({ received: true, activated: true });
  if (result.pending) {
    // A 5xx response asks Paystack to retry delivery if verification/database access is temporarily unavailable.
    return NextResponse.json({ received: false, error: result.message }, { status: 503 });
  }
  // Invalid/mismatched references must not be activated; acknowledge to avoid retry loops.
  console.error('JAAD billing webhook could not activate payment:', result.message);
  return NextResponse.json({ received: true, activated: false });
}
