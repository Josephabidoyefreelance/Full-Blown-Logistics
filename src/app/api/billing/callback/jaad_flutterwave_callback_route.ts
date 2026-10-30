import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingAdminClient, verifyAndActivateBankTransfer } from '@/lib/billing/flutterwave';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PaymentStatus = 'success' | 'pending' | 'failed';

function redirectTo(path: string, status?: PaymentStatus) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return NextResponse.json({ error: 'APP_URL is not configured.' }, { status: 503 });
  const destination = new URL(path, appUrl);
  if (status) destination.searchParams.set('payment', status);
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('tx_ref');
  if (!reference || !/^JAAD-[a-f0-9]{32}$/i.test(reference)) {
    return redirectTo('/customer/dashboard/packages', 'failed');
  }

  let admin: ReturnType<typeof createBillingAdminClient>;
  try {
    admin = createBillingAdminClient();
  } catch {
    return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  const { data: attempt, error } = await admin
    .from('billing_payment_attempts')
    .select('company_id, initiated_by')
    .eq('reference', reference)
    .maybeSingle();
  if (error || !attempt) return redirectTo('/customer/dashboard/packages', 'failed');

  // Customer checkout uses the shared packages page. This callback returns to
  // that customer-facing page without changing the checkout or webhook APIs.
  const packagePath = '/customer/dashboard/packages';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) return NextResponse.json({ error: 'APP_URL is not configured.' }, { status: 503 });
    const login = new URL('/customer/login', appUrl);
    login.searchParams.set('next', packagePath);
    return NextResponse.redirect(login);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.company_id || profile.company_id !== attempt.company_id || attempt.initiated_by !== user.id) {
    return redirectTo(packagePath, 'failed');
  }

  const result = await verifyAndActivateBankTransfer(
    reference,
    profile.company_id,
    url.searchParams.get('transaction_id') || undefined,
  );
  return redirectTo(packagePath, result.ok ? 'success' : result.pending ? 'pending' : 'failed');
}
