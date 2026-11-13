import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingAdminClient } from '@/lib/billing/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in to register a company.' }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Verify your email first.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  if (companyName.length < 2 || companyName.length > 160 || fullName.length < 2 || fullName.length > 160) {
    return NextResponse.json({ error: 'Company and contact names must be 2–160 characters.' }, { status: 400 });
  }

  let admin: ReturnType<typeof createBillingAdminClient>;
  try { admin = createBillingAdminClient(); }
  catch { return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 503 }); }

  // This lookup is only for idempotent retries by the same authenticated user.
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('company_id').eq('id', user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Could not check account registration.' }, { status: 500 });
  if (profile?.company_id) {
    const { data: owned } = await admin.from('companies').select('id')
      .eq('id', profile.company_id).eq('owner_user_id', user.id).maybeSingle();
    if (!owned) return NextResponse.json({ error: 'This account belongs to an existing company.' }, { status: 409 });
    return NextResponse.json({ success: true, companyId: owned.id, alreadyProvisioned: true });
  }
  if (profile) return NextResponse.json({ error: 'This account already has a profile. Contact support.' }, { status: 409 });

  // Atomic, trusted-server registration: company, owner profile, and platform lead.
  // The database function refuses registration for an existing staff/member account.
  const { data: companyId, error: registrationError } = await admin.rpc('jaad_register_business', {
    p_user_id: user.id,
    p_business_name: companyName,
    p_contact_name: fullName,
    p_phone: '',
  });
  if (registrationError || !companyId) {
    console.error('JAAD company registration failed:', registrationError?.message);
    return NextResponse.json({ error: 'Could not register the company. Please contact JAAD support if the account already exists.' }, { status: 409 });
  }

  // The company-insert database trigger initializes the subscription. Do not
  // silently activate Premium or overwrite a paid subscription from signup.
  return NextResponse.json({ success: true, companyId });
}
