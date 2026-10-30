import { NextResponse } from 'next/server';
import { verifyAndActivateBankTransfer, verifyFlutterwaveWebhookHash } from '@/lib/billing/flutterwave';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!verifyFlutterwaveWebhookHash(request.headers.get('verif-hash')))
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  const event = await request.json().catch(() => null) as
    { event?: string; data?: { id?: number; tx_ref?: string; payment_type?: string } } | null;
  if (!event || !event.data) return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 });
  if (event.event !== 'charge.completed' || event.data.payment_type !== 'bank_transfer')
    return NextResponse.json({ received: true });
  if (!event.data.tx_ref || event.data.id == null)
    return NextResponse.json({ error: 'Missing transaction identity.' }, { status: 400 });
  const result = await verifyAndActivateBankTransfer(event.data.tx_ref, undefined, event.data.id);
  if (result.ok) return NextResponse.json({ received: true, activated: true });
  if (result.pending) return NextResponse.json({ received: false }, { status: 503 });
  return NextResponse.json({ received: true, activated: false });
}
