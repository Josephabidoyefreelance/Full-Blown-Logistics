import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAndActivateBankTransfer } from '@/lib/billing/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function packageRedirect(status: 'success' | 'pending' | 'failed') {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is not configured.');
  const url = new URL('/packages', appUrl);
  url.searchParams.set('payment', status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
  if (!reference) return packageRedirect('failed');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) return NextResponse.json({ error: 'APP_URL is not configured.' }, { status: 503 });
    const login = new URL('/admin/login', appUrl);
    login.searchParams.set('next', '/packages');
    return NextResponse.redirect(login);
  }

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
  if (!profile?.company_id) return packageRedirect('failed');

  const result = await verifyAndActivateBankTransfer(reference, profile.company_id);
  if (result.ok) return packageRedirect('success');
  return packageRedirect(result.pending ? 'pending' : 'failed');
}
