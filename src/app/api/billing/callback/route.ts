import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAndActivateBankTransfer, createBillingAdminClient } from '@/lib/billing/flutterwave';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function packageRedirect(status: 'success' | 'pending' | 'failed') {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is not configured.');
  const url = new URL('/customer/dashboard/packages', appUrl);
  url.searchParams.set('payment', status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('tx_ref');
  if (!reference || !/^JAAD-[a-f0-9]{32}$/i.test(reference)) return packageRedirect('failed');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) return NextResponse.json({ error: 'APP_URL is not configured.' }, { status: 503 });
    const login = new URL('/customer/login', appUrl);
    login.searchParams.set('next', '/customer/dashboard/packages');
    return NextResponse.redirect(login);
  }

  // The reference belongs to exactly one attempt and verified initiating user.
  // A workspace switch during the Flutterwave redirect must not move payment.
  let admin: ReturnType<typeof createBillingAdminClient>;
  try { admin = createBillingAdminClient(); }
  catch { return packageRedirect('pending'); }
  const { data: attempt, error: attemptError } = await admin
    .from('billing_payment_attempts').select('company_id,initiated_by')
    .eq('reference', reference).maybeSingle();
  if (attemptError || !attempt || attempt.initiated_by !== user.id)
    return packageRedirect('failed');
  const { data: company, error: companyError } = await admin
    .from('companies').select('owner_user_id').eq('id', attempt.company_id).maybeSingle();
  if (companyError || !company || company.owner_user_id !== user.id)
    return packageRedirect('failed');
  const result = await verifyAndActivateBankTransfer(
    reference, attempt.company_id, url.searchParams.get('transaction_id') || undefined);
  if (result.ok) return packageRedirect('success');
  return packageRedirect(result.pending ? 'pending' : 'failed');
}
