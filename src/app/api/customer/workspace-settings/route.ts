import { NextResponse } from 'next/server';
import { getCustomerBillingWorkspace } from '@/lib/customer-billing-workspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-JAAD-Settings-API': 'v07' };
const ALLOWED_CURRENCIES = new Set([
  'NGN','USD','GBP','EUR','CAD','AUD','NZD','GHS','KES','ZAR','INR','AED',
  'XOF','XAF','JPY','CNY','CHF','SGD','BRL','MXN','SAR',
]);

async function readAuthorizedSettings() {
  const workspace = await getCustomerBillingWorkspace();
  if (!workspace) return null;
  const { data, error } = await workspace.supabase.rpc('jaad_customer_read_workspace_preferences', {
    p_customer_id: workspace.customerId,
  });
  if (error || !Array.isArray(data) || data.length !== 1) return null;
  const settings = data[0];
  if (settings.company_id !== workspace.company.id) return null;
  return { workspace, settings };
}

export async function GET() {
  const current = await readAuthorizedSettings();
  if (!current) return NextResponse.json({ error: 'No authorized customer workspace was resolved. Sign in to your own workspace or select one.' }, { status: 403, headers: NO_CACHE });
  const { workspace, settings } = current;
  return NextResponse.json({
    company_id: workspace.company.id,
    company_name: settings.company_name,
    is_owner: workspace.isBillingOwner,
    currency: settings.currency ?? 'NGN',
    tax_rate: Number(settings.tax_rate ?? 7.5),
    business_address: settings.business_address ?? '',
    logo_url: settings.logo_url ?? '',
  }, { headers: NO_CACHE });
}

export async function PATCH(request: Request) {
  const current = await readAuthorizedSettings();
  if (!current) return NextResponse.json({ error: 'Customer workspace membership required' }, { status: 403, headers: NO_CACHE });
  if (!current.workspace.isBillingOwner) return NextResponse.json({ error: 'Only the company owner may edit workspace settings' }, { status: 403, headers: NO_CACHE });
  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JSON');
    input = parsed as Record<string, unknown>;
  } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_CACHE }); }
  const { workspace, settings } = current;
  const companyName = String(input.company_name ?? settings.company_name).trim();
  const currency = String(input.currency ?? settings.currency ?? 'NGN').trim().toUpperCase();
  const taxRate = Number(input.tax_rate ?? settings.tax_rate ?? 7.5);
  const address = String(input.business_address ?? settings.business_address ?? '').trim();
  // Client-supplied public URLs must NEVER be used as ownership proof.
  // Ordinary profile/currency/tax saves ignore any stale logo_url in browser state.
  // Only an explicit object key created under the verified workspace can change branding.
  const origin = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!origin.startsWith('https://')) {
    return NextResponse.json({ error: 'Supabase storage origin is not configured' }, { status: 500, headers: NO_CACHE });
  }
  const companyPrefix = `${origin}/storage/v1/object/public/logos/${workspace.company.id}/`;
  const imageNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i;
  let logoUrl: string | null = typeof settings.logo_url === 'string' ? settings.logo_url : null;
  // Quarantine any prior stale/cross-workspace logo rather than carrying it into
  // otherwise valid preference updates. This does not read or copy that image.
  if (logoUrl && (!logoUrl.startsWith(companyPrefix) || !imageNamePattern.test(logoUrl.slice(companyPrefix.length)))) {
    logoUrl = null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'logo_path')) {
    if (input.logo_path === null || input.logo_path === '') {
      logoUrl = null;
    } else if (typeof input.logo_path === 'string') {
      const expectedPrefix = `${workspace.company.id}/`;
      if (!input.logo_path.startsWith(expectedPrefix) ||
          !imageNamePattern.test(input.logo_path.slice(expectedPrefix.length))) {
        return NextResponse.json({ error: 'Logo object does not belong to your workspace' }, { status: 400, headers: NO_CACHE });
      }
      // The SQL RPC independently verifies this exact storage object exists,
      // and that the signed-in user owns the same company.
      logoUrl = `${origin}/storage/v1/object/public/logos/${input.logo_path}`;
    } else {
      return NextResponse.json({ error: 'Invalid logo object key' }, { status: 400, headers: NO_CACHE });
    }
  }
  if (!companyName || companyName.length > 160 || address.length > 1000 ||
    !ALLOWED_CURRENCIES.has(currency) || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return NextResponse.json({ error: 'Invalid company name, currency, business address or tax rate' }, { status: 400, headers: NO_CACHE });
  }
  // The RPC independently checks auth.uid(), ownership, an active subscription,
  // and the storage object: the authenticated caller cannot switch company IDs.
  const { error } = await workspace.supabase.rpc('jaad_customer_save_workspace_preferences', {
    p_company_id: workspace.company.id,
    p_company_name: companyName,
    p_currency: currency,
    p_tax_rate: taxRate,
    p_business_address: address,
    p_logo_url: logoUrl,
  });
  if (error) return NextResponse.json({ error: 'Workspace settings could not be saved. Verify subscription and workspace permissions.' }, { status: 403, headers: NO_CACHE });
  const { data: check, error: readError } = await workspace.supabase.rpc('jaad_customer_read_workspace_preferences', {
    p_customer_id: workspace.customerId,
  });
  if (readError || !Array.isArray(check) || check.length !== 1 ||
    check[0].currency !== currency || Math.abs(Number(check[0].tax_rate) - taxRate) > 0.0001 ||
    (check[0].logo_url ?? null) !== logoUrl) {
    return NextResponse.json({ error: 'Workspace save could not be verified. Please reload before making further changes.' }, { status: 500, headers: NO_CACHE });
  }
  return NextResponse.json({
    ok: true, company_id: workspace.company.id, company_name: check[0].company_name,
    currency: check[0].currency, tax_rate: Number(check[0].tax_rate),
    business_address: check[0].business_address ?? '', logo_url: check[0].logo_url ?? '',
  }, { headers: NO_CACHE });
}
