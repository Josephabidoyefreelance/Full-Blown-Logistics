import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Only a user who has completed Supabase email verification may create a CRM lead.
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user || !user.email_confirmed_at) {
    return NextResponse.json({ success: false, error: 'Verify your email before submitting the signup form.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ success: false, error: 'CRM lead capture is not configured on the server.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid signup form.' }, { status: 400 });
  }

  const company = typeof body.company === 'string' ? body.company.trim().slice(0, 180) : '';
  const contactName = typeof body.contact_name === 'string' ? body.contact_name.trim().slice(0, 180) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  if (!company || !contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone) {
    return NextResponse.json({ success: false, error: 'Please provide a valid name, email and phone number.' }, { status: 400 });
  }

  // Bind the CRM lead to the verified identity rather than trusting a client-supplied user ID.
  if ((user.email || '').toLowerCase() !== email) {
    return NextResponse.json({ success: false, error: 'The verified email does not match the signup email.' }, { status: 403 });
  }

  const service = createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Only the configured JAAD platform company may receive acquisition leads.
  const { data: config, error: configError } = await service
    .from('jaad_platform_config')
    .select('crm_company_id')
    .eq('singleton', true)
    .single();
  if (configError || !config?.crm_company_id) {
    return NextResponse.json({ success: false, error: 'Platform CRM is not configured.' }, { status: 503 });
  }

  // A registration can reach this endpoint before or after provisioning.
  // Never create a second lead for the same verified auth user.
  const { data: existing, error: lookupError } = await service
    .from('leads').select('id').eq('registration_user_id', user.id).maybeSingle();
  if (lookupError) {
    return NextResponse.json({ success: false, error: 'Could not check existing registration lead.' }, { status: 503 });
  }
  if (existing) {
    return NextResponse.json({ success: true, alreadyRecorded: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const { error } = await service.from('leads').insert({
    company_id: config.crm_company_id,
    registration_user_id: user.id,
    company,
    contact_name: contactName,
    email,
    phone,
    source: 'Website',
    priority: 'Warm',
    status: 'New',
    value: 0,
  });

  if (error && error.code !== '23505') {
    console.error('Public customer signup CRM lead insert failed:', error.message);
    return NextResponse.json({ success: false, error: 'Could not add this signup to CRM Leads. Check the leads table permissions and required columns.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
