import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasFullCrmAccess, planAllowsModule, type CustomerModule, type JaadPlanCode } from '@/lib/billing/plans';

export type CustomerTenantContext = {
  userId: string;
  companyId: string;
  companyName: string;
  planCode: JaadPlanCode;
  subscriptionEndsAt: string;
  isBillingOwner: boolean;
  fullCrmAccess: boolean;
};

export async function getCustomerTenantContext(): Promise<CustomerTenantContext | null> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id, status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile?.company_id || String(profile.status ?? 'Active').toLowerCase() !== 'active') return null;

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, owner_user_id')
    .eq('id', profile.company_id)
    .maybeSingle();
  if (companyError || !company) return null;

  const { data: subscription, error: subscriptionError } = await supabase
    .from('company_subscriptions')
    .select('plan_code, status, current_period_end')
    .eq('company_id', profile.company_id)
    .maybeSingle();
  if (subscriptionError || !subscription || subscription.status !== 'active' || !subscription.current_period_end) return null;
  if (new Date(subscription.current_period_end).getTime() <= Date.now()) return null;
  if (!['basic', 'standard', 'business', 'premium'].includes(String(subscription.plan_code))) return null;

  return {
    userId: user.id,
    companyId: String(company.id),
    companyName: String(company.name ?? 'Your company'),
    planCode: subscription.plan_code as JaadPlanCode,
    subscriptionEndsAt: String(subscription.current_period_end),
    isBillingOwner: company.owner_user_id === user.id,
    fullCrmAccess: hasFullCrmAccess(String(subscription.plan_code)),
  };
}

export async function requireCustomerTenantContext() {
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== 'enabled') return null;
  return getCustomerTenantContext();
}

export async function requireCustomerModule(module: CustomerModule) {
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== 'enabled') return { ok: false as const, reason: 'setup' as const };
  const context = await getCustomerTenantContext();
  if (!context) return { ok: false as const, reason: 'subscription' as const };
  if (!planAllowsModule(context.planCode, module)) return { ok: false as const, reason: 'plan' as const, context };
  return { ok: true as const, context };
}

export async function redirectIfNotCustomerModule(module: CustomerModule) {
  const result = await requireCustomerModule(module);
  if (result.ok) return result.context;
  if (result.reason === 'setup') redirect('/customer/dashboard?setup=tenant-security');
  if (result.reason === 'subscription') redirect('/packages?subscription=required');
  redirect('/packages?upgrade=required');
}
