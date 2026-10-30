import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { JAAD_PLANS, type JaadPlanCode } from '@/lib/billing/plans';
import { createBillingAdminClient } from '@/lib/billing/flutterwave';

export const runtime = 'nodejs';

function isPlanCode(value: unknown): value is JaadPlanCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(JAAD_PLANS, value);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to manage your company package.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { planCode?: unknown };
  if (!isPlanCode(body.planCode)) {
    return NextResponse.json({ error: 'Choose a valid JAAD package.' }, { status: 400 });
  }
  const plan = JAAD_PLANS[body.planCode];

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, company_id')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: 'Your account is not assigned to a company workspace. Contact your administrator.' }, { status: 409 });
  }
  const email = profile.email || user.email;
  if (!email) return NextResponse.json({ error: 'A valid billing email is required.' }, { status: 400 });

  let admin;
  try {
    admin = createBillingAdminClient();
  } catch {
    return NextResponse.json({ error: 'Billing is not configured on the server yet.' }, { status: 503 });
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, name, owner_user_id')
    .eq('id', profile.company_id)
    .maybeSingle();
  if (companyError || !company) return NextResponse.json({ error: 'Your company workspace could not be found.' }, { status: 404 });
  if (company.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Only the company billing owner can choose or renew a package.' }, { status: 403 });
  }

  const reference = `JAAD-${randomUUID().replaceAll('-', '')}`;
  const amountKobo = plan.priceNaira * 100;
  const { data: attempt, error: insertError } = await admin
    .from('billing_payment_attempts')
    .insert({
      company_id: company.id,
      initiated_by: user.id,
      plan_code: plan.code,
      amount_kobo: amountKobo,
      currency: 'NGN',
      reference,
      status: 'pending',
      payment_provider: 'flutterwave',
    })
    .select('id')
    .single();
  if (insertError || !attempt) {
    console.error('JAAD billing attempt insert failed:', insertError?.message);
    return NextResponse.json({ error: 'Could not prepare the bank transfer request.' }, { status: 500 });
  }

  const appUrl = process.env.APP_URL;
  const secret = process.env.FLW_SECRET_KEY;
  if (!appUrl || !secret) {
    await admin.from('billing_payment_attempts').update({ status: 'failed', failure_message: 'Billing environment is incomplete.' }).eq('id', attempt.id);
    return NextResponse.json({ error: 'Set APP_URL and FLW_SECRET_KEY in the server environment.' }, { status: 503 });
  }

  try {
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: reference,
        amount: plan.priceNaira,
        currency: 'NGN',
        redirect_url: new URL('/api/billing/callback', appUrl).toString(),
        payment_options: 'banktransfer',
        customer: { email, name: company.name },
        meta: { payment_attempt_id: attempt.id, company_id: company.id, plan_code: plan.code },
        customizations: { title: 'JAAD Logistics ERP', description: `${plan.name} subscription` },
      }),
      cache: 'no-store',
    });
    const result = await flutterwaveResponse.json().catch(() => null) as
      | { status?: string; message?: string; data?: { link?: string } } | null;
    const checkoutUrl = result?.data?.link;
    if (!flutterwaveResponse.ok || result?.status !== 'success' || !checkoutUrl) {
      await admin.from('billing_payment_attempts')
        .update({ status: 'failed', failure_message: result?.message || 'Flutterwave checkout initialization failed.' })
        .eq('id', attempt.id);
      return NextResponse.json({ error: 'Flutterwave could not start bank-transfer checkout. Check your Flutterwave account payment-method settings.' }, { status: 502 });
    }

    await admin.from('billing_payment_attempts').update({ checkout_url: checkoutUrl }).eq('id', attempt.id);
    return NextResponse.json({ authorizationUrl: checkoutUrl });
  } catch (error) {
    await admin.from('billing_payment_attempts')
      .update({ status: 'failed', failure_message: 'Unable to reach Flutterwave.' })
      .eq('id', attempt.id);
    console.error('JAAD Flutterwave checkout network error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Unable to reach Flutterwave. Please retry shortly.' }, { status: 502 });
  }
}
