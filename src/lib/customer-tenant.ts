import 'server-only';
import { redirect } from 'next/navigation';
import { getCustomerWorkspaceSelection } from '@/lib/customer-active-tenant';
import { hasFullCrmAccess, planAllowsModule, type CustomerModule, type JaadPlanCode } from '@/lib/billing/plans';

const OWNER_MODULES = new Set([
  'overview', 'inventory', 'leads', 'shipments', 'track', 'invoices',
  'notes', 'report', 'support', 'profile', 'calculator', 'utilities'
]);
const ERP_MODULE_ALIASES: Record<string, string[]> = {
  crm: ['leads'], finance: ['invoices', 'report'], warehouse: ['inventory'],
  reports: ['report'], customers: ['leads'],
};

export type CustomerTenantContext = {
  userId: string;
  customerId: string;
  ownerUserId: string;
  companyId: string;
  companyName: string;
  planCode: JaadPlanCode;
  subscriptionEndsAt: string;
  isCustomerOwner: boolean;
  isBillingOwner: boolean;
  fullCrmAccess: boolean;
  permittedModules: string[];
};

/**
 * Independently verify customer portal identity. A JAAD administrative profile
 * is never used to infer a customer workspace or customer role.
 */
export async function getCustomerTenantContext(): Promise<CustomerTenantContext | null> {
  const selection = await getCustomerWorkspaceSelection();
  if (!selection?.customerId) return null;
  const { supabase, user, customerId } = selection;

  const { data: customer, error: customerError } = await supabase
    .from('customers').select('id, user_id, company_id, status')
    .eq('id', customerId).maybeSingle();
  if (customerError || !customer || String(customer.status).toLowerCase() !== 'active' ||
      !customer.company_id || !customer.user_id) return null;

  const isCustomerOwner = customer.user_id === user.id;
  let permittedModules: string[];
  if (isCustomerOwner) {
    permittedModules = [...OWNER_MODULES, 'crm', 'customers', 'drivers', 'fleet',
      'finance', 'warehouse', 'hr', 'reports', 'ai-chat', 'clock-tracker', 'calendar', 'chat'];
  } else {
    const { data: memberships, error: membershipError } = await supabase
      .from('customer_team_members')
      .select('permitted_modules, status, accepted_at')
      .eq('customer_id', customerId).eq('user_id', user.id)
      .eq('status', 'Active').not('accepted_at', 'is', null).limit(2);
    if (membershipError || !memberships || memberships.length !== 1) return null;
    permittedModules = Array.isArray(memberships[0].permitted_modules)
      ? memberships[0].permitted_modules.filter((m): m is string => typeof m === 'string') : [];
  }

  const { data: company, error: companyError } = await supabase
    .from('companies').select('id, name, owner_user_id')
    .eq('id', customer.company_id).maybeSingle();
  if (companyError || !company) return null;

  const { data: subscription, error: subscriptionError } = await supabase
    .from('company_subscriptions').select('plan_code, status, current_period_end')
    .eq('company_id', company.id).maybeSingle();
  const valid = !subscriptionError && !!subscription &&
    ['active', 'trialing'].includes(String(subscription.status).toLowerCase()) &&
    !!subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now() &&
    ['basic', 'standard', 'business', 'premium'].includes(String(subscription.plan_code));
  if (!valid) return null;

  const planCode = String(subscription!.plan_code) as JaadPlanCode;
  return {
    userId: user.id,
    customerId,
    ownerUserId: customer.user_id,
    companyId: String(company.id),
    companyName: String(company.name ?? 'Your company'),
    planCode,
    subscriptionEndsAt: String(subscription!.current_period_end),
    isCustomerOwner,
    isBillingOwner: company.owner_user_id === user.id,
    fullCrmAccess: hasFullCrmAccess(planCode),
    permittedModules,
  };
}

export async function requireCustomerTenantContext() {
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== 'enabled') return null;
  return getCustomerTenantContext();
}

export async function requireCustomerModule(module: CustomerModule) {
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== 'enabled')
    return { ok: false as const, reason: 'setup' as const };
  const context = await getCustomerTenantContext();
  if (!context) return { ok: false as const, reason: 'subscription' as const };
  if (!planAllowsModule(context.planCode, module))
    return { ok: false as const, reason: 'plan' as const, context };
  if (!context.isCustomerOwner && ![
    module, ...(ERP_MODULE_ALIASES[module] ?? [])
  ].some(m => context.permittedModules.includes(m)))
    return { ok: false as const, reason: 'role' as const, context };
  return { ok: true as const, context };
}

export async function redirectIfNotCustomerModule(module: CustomerModule) {
  const result = await requireCustomerModule(module);
  if (result.ok) return result.context;
  if (!(await getCustomerWorkspaceSelection())?.customerId)
    redirect('/customer/dashboard/select-workspace');
  if (result.reason === 'setup') redirect('/customer/dashboard?setup=tenant-security');
  if (result.reason === 'role') redirect('/customer/dashboard?access=denied');
  if (result.reason === 'subscription') redirect('/packages?subscription=required');
  redirect('/packages?upgrade=required');
}
