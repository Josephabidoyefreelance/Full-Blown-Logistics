import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingAdminClient } from '@/lib/billing/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Verify your email and sign in before creating a company workspace.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { companyName?: unknown; fullName?: unknown };
  const companyName = String(body.companyName ?? '').trim();
  const fullName = String(body.fullName ?? user.user_metadata?.full_name ?? '').trim();
  if (companyName.length < 2 || companyName.length > 160) return NextResponse.json({ error: 'Enter a company name between 2 and 160 characters.' }, { status: 400 });

  let admin;
  try { admin = createBillingAdminClient(); }
  catch { return NextResponse.json({ error: 'Company registration is not configured on the server.' }, { status: 503 }); }

  const { data: existingProfile, error: profileLookupError } = await admin.from('profiles').select('id, company_id').eq('id', user.id).maybeSingle();
  if (profileLookupError) return NextResponse.json({ error: 'Could not verify your JAAD profile.' }, { status: 500 });
  if (existingProfile?.company_id) return NextResponse.json({ success: true, companyId: existingProfile.company_id, alreadyProvisioned: true });

  const { data: company, error: companyError } = await admin.from('companies').insert({ name: companyName, owner_user_id: user.id }).select('id').single();
  if (companyError || !company) {
    console.error('JAAD company provisioning failed:', companyError?.message);
    return NextResponse.json({ error: 'Could not create your company workspace. Please retry or contact JAAD support.' }, { status: 500 });
  }

  const profilePayload = { id: user.id, email: user.email ?? '', full_name: fullName || companyName, status: 'Active', company_id: company.id };
  const profileWrite = existingProfile
    ? await admin.from('profiles').update(profilePayload).eq('id', user.id)
    : await admin.from('profiles').insert(profilePayload);
  if (profileWrite.error) {
    await admin.from('companies').delete().eq('id', company.id);
    console.error('JAAD company profile linking failed:', profileWrite.error.message);
    return NextResponse.json({ error: 'Company was not linked to your login. Please contact JAAD support before trying again.' }, { status: 500 });
  }

  const { error: subscriptionError } = await admin.from('company_subscriptions').upsert({ company_id: company.id, plan_code: 'basic', status: 'inactive', current_period_start: null, current_period_end: null }, { onConflict: 'company_id' });
  if (subscriptionError) {
    await admin.from('profiles').update({ company_id: null }).eq('id', user.id);
    await admin.from('companies').delete().eq('id', company.id);
    console.error('JAAD initial subscription record failed:', subscriptionError.message);
    return NextResponse.json({ error: 'Company created but subscription setup failed. Please contact JAAD support.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, companyId: company.id });
}
