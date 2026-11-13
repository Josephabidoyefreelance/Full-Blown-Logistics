import { NextResponse } from 'next/server';
import { getCustomerBillingWorkspace } from '@/lib/customer-billing-workspace';

export const dynamic = 'force-dynamic';
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
/**
 * Mint a short-lived signed URL only after a fresh workspace membership check.
 * The logos bucket may remain PRIVATE. Storage SELECT RLS is company-scoped.
 */
export async function GET() {
  const workspace = await getCustomerBillingWorkspace();
  if (!workspace) return NextResponse.json({ error: 'Workspace membership required' }, { status: 403, headers: HEADERS });
  const { data, error } = await workspace.supabase.rpc('jaad_customer_read_workspace_preferences', {
    p_customer_id: workspace.customerId,
  });
  if (error || !Array.isArray(data) || data.length !== 1) return NextResponse.json({ error: 'Workspace settings unavailable' }, { status: 403, headers: HEADERS });
  const logo = data[0].logo_url;
  if (!logo) return NextResponse.json({ url: null }, { headers: HEADERS });
  const origin = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const prefix = `${origin}/storage/v1/object/public/logos/${workspace.company.id}/`;
  if (typeof logo !== 'string' || !origin.startsWith('https://') || !logo.startsWith(prefix)) {
    return NextResponse.json({ url: null }, { headers: HEADERS });
  }
  const filename = logo.slice(prefix.length);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i.test(filename)) {
    return NextResponse.json({ url: null }, { headers: HEADERS });
  }
  const objectPath = `${workspace.company.id}/${filename}`;
  const { data: signed, error: storageError } = await workspace.supabase.storage.from('logos').createSignedUrl(objectPath, 900);
  if (storageError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Logo image unavailable; verify tenant-safe logo SELECT policy' }, { status: 503, headers: HEADERS });
  }
  return NextResponse.json({ url: signed.signedUrl }, { headers: HEADERS });
}
