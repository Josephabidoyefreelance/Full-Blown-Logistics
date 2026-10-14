export type JaadPlanCode = 'basic' | 'standard' | 'premium';

export type JaadPlan = {
  code: JaadPlanCode;
  name: string;
  priceNaira: number;
  summary: string;
  features: string[];
  accent: string;
  badge?: { label: string; style: string };
};

// Prices are defined on the server. Never accept a payment amount from the browser.
export const JAAD_PLANS: Record<JaadPlanCode, JaadPlan> = {
  basic: {
    code: 'basic',
    name: 'Basic',
    priceNaira: 5000,
    summary: 'Core logistics operations for day-to-day work.',
    features: [
      'CRM & Leads — basic access',
      'Customer Management',
      'Shipment Operations',
      'Fleet',
      'Driver Management',
      'Limited Support access',
    ],
    accent: 'border-neutral-200 dark:border-neutral-800',
  },
  standard: {
    code: 'standard',
    name: 'Standard',
    priceNaira: 10000,
    summary: 'Core logistics operations plus productivity tools.',
    features: [
      'Everything in Basic',
      'Clock Tracker',
      'Calendar',
      'AI Assistant',
      'Email inside JAAD ERP',
      'Calling inside JAAD ERP',
    ],
    accent: 'border-red-300 ring-1 ring-red-100 dark:border-red-900 dark:ring-red-950',
    badge: {
      label: 'Productivity package',
      style: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    },
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    priceNaira: 20000,
    summary: 'The Standard package plus full CRM access.',
    features: ['Everything in Standard', 'Full CRM access', 'Expanded Support access'],
    accent: 'border-violet-300 ring-1 ring-violet-100 dark:border-violet-900 dark:ring-violet-950',
    badge: {
      label: 'Premium access',
      style: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    },
  },
};

export function naira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}
