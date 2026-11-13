import 'server-only';
import type { createClient } from '@/lib/supabase/server';
import { getCustomerWorkspaceSelection } from '@/lib/customer-active-tenant';

export type WorkspaceMoney = { currency: string; taxRate: number };
export async function loadWorkspaceMoney(
  db: Awaited<ReturnType<typeof createClient>>, companyId: string
): Promise<WorkspaceMoney> {
  const selection = await getCustomerWorkspaceSelection();
  if (!selection?.customerId) throw new Error('Select an authorized customer workspace first');
  const { data, error } = await db.rpc('jaad_customer_read_workspace_preferences', {
    p_customer_id: selection.customerId,
  });
  if (error || !Array.isArray(data) || data.length !== 1 || data[0].company_id !== companyId)
    throw new Error('Unable to read financial settings for this authorized workspace');
  const currency = String(data[0].currency).toUpperCase();
  const taxRate = Number(data[0].tax_rate);
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
    throw new Error('Workspace financial settings are invalid');
  return {currency, taxRate};
}
export function moneyText(amount: number | null | undefined, currency: string): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en', {style: 'currency', currency,
    maximumFractionDigits: 2}).format(n);
}
