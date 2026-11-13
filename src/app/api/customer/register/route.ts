import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Registration service is not configured.' }, { status: 503 });
    }

    const verifier = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await verifier.auth.getUser(token);
    if (authError || !user || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Email verification required.' }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid registration details.' }, { status: 400 });
    }
    const values = body as Record<string, unknown>;
    const businessName = typeof values.businessName === 'string' ? values.businessName.trim() : '';
    const contactName = typeof values.contactName === 'string' ? values.contactName.trim() : '';
    const phone = typeof values.phone === 'string' ? values.phone.trim() : '';
    if (businessName.length < 2 || businessName.length > 150 || contactName.length < 2 || contactName.length > 150 || phone.length > 40) {
      return NextResponse.json({ error: 'Enter valid business and contact details.' }, { status: 400 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Never create a second company for an already provisioned account.
    const { data: profile, error: profileError } = await admin
      .from('profiles').select('company_id').eq('id', user.id).maybeSingle();
    if (profileError) {
      console.error('Registration profile lookup failed:', profileError.code);
      return NextResponse.json({ error: 'Unable to check registration.' }, { status: 500 });
    }
    if (profile?.company_id) {
      const { data: owned, error: ownerError } = await admin
        .from('companies').select('id')
        .eq('id', profile.company_id).eq('owner_user_id', user.id).maybeSingle();
      if (ownerError) return NextResponse.json({ error: 'Unable to check company ownership.' }, { status: 500 });
      if (!owned) return NextResponse.json({ error: 'This account already belongs to another company.' }, { status: 409 });
      return NextResponse.json({ companyId: owned.id, success: true, alreadyProvisioned: true });
    }
    if (profile) {
      return NextResponse.json({ error: 'This account already has a profile. Contact support.' }, { status: 409 });
    }

    // Database RPC atomically provisions the company, owner profile and JAAD acquisition lead.
    // The service role is used only on the server; user identity is verified above.
    const { data: companyId, error } = await admin.rpc('jaad_register_business', {
      p_user_id: user.id,
      p_business_name: businessName,
      p_contact_name: contactName,
      p_phone: phone,
    });
    if (error || !companyId) {
      console.error('JAAD registration RPC failed:', error?.code, error?.message);
      return NextResponse.json({ error: 'Unable to create workspace. Please retry or contact support.' }, { status: 409 });
    }
    // Subscription creation is handled by the existing company INSERT trigger.
    return NextResponse.json({ companyId, success: true });
  } catch (error) {
    console.error('Registration endpoint error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
