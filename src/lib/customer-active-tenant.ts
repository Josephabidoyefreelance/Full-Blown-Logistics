import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const CUSTOMER_TENANT_COOKIE = 'jaad_customer_tenant_id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The cookie is a preference, NEVER an authorization grant.
 * Every request validates it against the authenticated user's live, accepted,
 * active customer membership. No profile.company_id and no email matching.
 * If more than one tenant is available and none is selected, fail closed.
 */
export async function getCustomerWorkspaceSelection() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase.rpc('jaad_my_customer_tenants');
  if (error || !Array.isArray(data)) return null;
  const tenantIds = [...new Set(data.filter((id): id is string =>
    typeof id === 'string' && UUID_RE.test(id)
  ))];
  const selected = (await cookies()).get(CUSTOMER_TENANT_COOKIE)?.value ?? null;
  // A previous user's tenant cookie can remain in this browser after sign-out.
  // Ignore unauthorized/stale cookies, and choose automatically ONLY when
  // the signed-in user has exactly one currently authorized workspace.
  const customerId = selected && UUID_RE.test(selected) && tenantIds.includes(selected)
    ? selected
    : (tenantIds.length === 1 ? tenantIds[0] : null);

  return { supabase, user, tenantIds, customerId };
}

/** Only use this when the caller needs an explicitly authorized tenant. */
export async function requireSelectedCustomerId(): Promise<string | null> {
  return (await getCustomerWorkspaceSelection())?.customerId ?? null;
}
