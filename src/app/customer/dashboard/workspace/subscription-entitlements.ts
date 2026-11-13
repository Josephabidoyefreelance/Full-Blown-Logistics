/**
 * JAAD Logistics customer subscription entitlement map.
 *
 * IMPORTANT: This file is a single source of truth for intended tier rules, not a
 * substitute for server-side guards and Supabase RLS. Do not enable the customer
 * workspace safety gate until every page, server action, and database policy is
 * tenant-scoped and checks these entitlements on the server.
 */
export type JaadPlanAmount = 5000 | 10000 | 15000 | 20000;
export type JaadModule =
  | "shipments" | "customers" | "drivers" | "fleet" | "warehouse"
  | "finance" | "hr" | "crm" | "support" | "reports" | "calendar"
  | "clock-tracker" | "ai-chat";

export const JAAD_SUBSCRIPTION_PLANS: Record<JaadPlanAmount, {
  name: string;
  amountNaira: JaadPlanAmount;
  description: string;
  modules: JaadModule[];
  crmLevel: "none" | "limited" | "full";
}> = {
  5000: {
    name: "Basic",
    amountNaira: 5000,
    description: "Core logistics workspace with limited CRM access.",
    modules: ["shipments", "customers", "support"],
    crmLevel: "limited",
  },
  10000: {
    name: "Standard",
    amountNaira: 10000,
    description: "Core operations with fleet and driver tools.",
    modules: ["shipments", "customers", "drivers", "fleet", "support", "reports"],
    crmLevel: "limited",
  },
  15000: {
    name: "Advanced",
    amountNaira: 15000,
    description: "Expanded operations, finance, warehouse and staff tools.",
    modules: ["shipments", "customers", "drivers", "fleet", "warehouse", "finance", "hr", "support", "reports", "calendar", "clock-tracker"],
    crmLevel: "limited",
  },
  20000: {
    name: "Business",
    amountNaira: 20000,
    description: "Full workspace access, including full CRM.",
    modules: ["shipments", "customers", "drivers", "fleet", "warehouse", "finance", "hr", "crm", "support", "reports", "calendar", "clock-tracker", "ai-chat"],
    crmLevel: "full",
  },
};

export function getJaadPlan(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return null;
  return JAAD_SUBSCRIPTION_PLANS[amount as JaadPlanAmount] ?? null;
}

export function planIncludesModule(amount: number | null | undefined, module: JaadModule): boolean {
  const plan = getJaadPlan(amount);
  return Boolean(plan && plan.modules.includes(module));
}

export function hasFullCrmAccess(amount: number | null | undefined): boolean {
  return getJaadPlan(amount)?.crmLevel === "full";
}
