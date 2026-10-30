export type JaadPlanCode = 'basic' | 'standard' | 'business' | 'premium';

export type JaadPlan = {
  code: JaadPlanCode;
  name: string;
  priceNaira: number;
  summary: string;
  features: string[];
  accent: string;
  badge?: { label: string; style: string };
};

// Server-owned pricing. Never trust a price submitted by the browser.
export const JAAD_PLANS: Record<JaadPlanCode, JaadPlan> = {
  basic: {
    code: 'basic',
    name: 'Basic',
    priceNaira: 5000,
    summary: 'Core logistics operations for day-to-day work.',
    features: ['Shipment operations', 'Customer management', 'Fleet and drivers', 'Basic CRM access', 'Limited support'],
    accent: 'border-neutral-200 dark:border-neutral-800',
  },
  standard: {
    code: 'standard',
    name: 'Standard',
    priceNaira: 10000,
    summary: 'Core logistics operations plus productivity tools.',
    features: ['Everything in Basic', 'Clock Tracker', 'Calendar', 'AI Assistant', 'Email and calling inside JAAD ERP'],
    accent: 'border-red-300 ring-1 ring-red-100 dark:border-red-900 dark:ring-red-950',
    badge: { label: 'Productivity package', style: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  },
  business: {
    code: 'business',
    name: 'Business',
    priceNaira: 15000,
    summary: 'Productivity tools with expanded reporting and support.',
    features: ['Everything in Standard', 'Warehouse and inventory', 'Finance and invoicing', 'HR and employee management', 'Business reporting', 'Priority support; CRM remains limited'],
    accent: 'border-amber-300 ring-1 ring-amber-100 dark:border-amber-900 dark:ring-amber-950',
    badge: { label: 'Business package', style: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    priceNaira: 20000,
    summary: 'Full JAAD ERP access, including the complete CRM toolkit.',
    features: ['Everything in Business', 'Full CRM access', 'Advanced CRM views and lead tools', 'Expanded support access'],
    accent: 'border-violet-300 ring-1 ring-violet-100 dark:border-violet-900 dark:ring-violet-950',
    badge: { label: 'Full access', style: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  },
};

export function naira(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

export type CustomerModule = 'dashboard' | 'crm' | 'customers' | 'shipments' | 'fleet' | 'drivers' | 'warehouse' | 'finance' | 'hr' | 'support' | 'reports' | 'clock-tracker' | 'calendar' | 'ai-chat';

const BASE_MODULES = new Set<CustomerModule>(['dashboard', 'crm', 'customers', 'shipments', 'fleet', 'drivers', 'support']);
const STANDARD_MODULES = new Set<CustomerModule>([...BASE_MODULES, 'clock-tracker', 'calendar', 'ai-chat']);
const BUSINESS_MODULES = new Set<CustomerModule>([...STANDARD_MODULES, 'warehouse', 'finance', 'reports', 'hr']);

export function planAllowsModule(planCode: string, module: CustomerModule): boolean {
  if (module === 'crm') return ['basic', 'standard', 'business', 'premium'].includes(planCode);
  if (planCode === 'basic') return BASE_MODULES.has(module);
  if (planCode === 'standard') return STANDARD_MODULES.has(module);
  if (planCode === 'business' || planCode === 'premium') return BUSINESS_MODULES.has(module);
  return false;
}

export function hasFullCrmAccess(planCode: string): boolean {
  return planCode === 'premium';
}
