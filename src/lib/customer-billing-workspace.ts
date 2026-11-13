import 'server-only';
import { getCustomerWorkspaceSelection } from '@/lib/customer-active-tenant';

/**
 * The SQL function checks auth.uid() against the dedicated SaaS workspace
 * owner or an accepted active membership. A cookie is NEVER proof of access.
 * Unlike the old implementation, restrictive ADMIN table policies cannot
 * accidentally conceal an otherwise valid customer workspace here.
 */
export async function getCustomerBillingWorkspace() {
  const selection = await getCustomerWorkspaceSelection();
  if (!selection?.customerId) return null;
  const { supabase, user, customerId } = selection;
  const { data, error } = await supabase.rpc('jaad_customer_read_workspace_preferences', {
    p_customer_id: customerId,
  });
  if (error || !Array.isArray(data) || data.length !== 1) return null;
  const row = data[0];
  if (!row || typeof row.company_id !== 'string' || typeof row.company_name !== 'string') return null;
  return {
    user, customerId, supabase,
    company: {
      id: String(row.company_id), name: String(row.company_name),
      owner_user_id: String(row.owner_user_id),
    },
    isBillingOwner: row.is_owner === true,
  };
}
