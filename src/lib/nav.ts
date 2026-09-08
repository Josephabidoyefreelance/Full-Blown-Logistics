export type ModuleKey =
  | 'dashboard'
  | 'crm'
  | 'customers'
  | 'shipments'
  | 'fleet'
  | 'drivers'
  | 'warehouse'
  | 'finance'
  | 'hr'
  | 'support'
  | 'reports'
  | 'clock'
  | 'calendar'
  | 'ai-chat'
  | 'admin';

export type NavChild = { key: string; label: string; href: string; icon: string; color: string };

export type NavItem = { key: ModuleKey; label: string; href: string; icon: string; color: string; children?: NavChild[] };

export const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', color: '#6366f1' }] },
  {
    section: 'Revenue & Clients',
    items: [
      { key: 'crm', label: 'CRM & Leads', href: '/crm', icon: 'funnel', color: '#f59e0b' },
      { key: 'customers', label: 'Customer Management', href: '/customers', icon: 'users', color: '#0ea5e9' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { key: 'shipments', label: 'Shipment Operations', href: '/shipments', icon: 'package', color: '#22c55e' },
      { key: 'fleet', label: 'Fleet', href: '/fleet', icon: 'truck', color: '#f97316' },
      { key: 'drivers', label: 'Driver Management', href: '/drivers', icon: 'id-card', color: '#a855f7' },
      { key: 'warehouse', label: 'Warehouse', href: '/warehouse', icon: 'warehouse', color: '#14b8a6' },
    ],
  },
  {
    section: 'Finance & People',
    items: [
      { key: 'finance', label: 'Finance', href: '/finance', icon: 'banknote', color: '#059669' },
      { key: 'hr', label: 'HR & Careers', href: '/hr', icon: 'briefcase', color: '#ec4899' },
    ],
  },
  {
    section: 'Service & Insight',
    items: [
      {
        key: 'support',
        label: 'Support',
        href: '/support',
        icon: 'headset',
        color: '#dc2626',
        children: [
          { key: 'support-livechat', label: 'Live Chat', href: '/support?view=livechat', icon: 'message-circle', color: '#1f9d5c' },
          { key: 'support-email', label: 'Email', href: '/support?view=email', icon: 'mail', color: '#2563c7' },
          { key: 'support-sms', label: 'SMS', href: '/support?view=sms', icon: 'message-square', color: '#7c3aed' },
          { key: 'support-call', label: 'Call', href: '/support?view=call', icon: 'phone', color: '#ca8a04' },
          { key: 'support-whatsapp', label: 'WhatsApp', href: '/support?view=whatsapp', icon: 'whatsapp', color: '#16a34a' },
        ],
      },
      { key: 'reports', label: 'Reports', href: '/reports', icon: 'bar-chart', color: '#3b82f6' },
      { key: 'clock', label: 'Clock Tracker', href: '/clock-tracker', icon: 'clock', color: '#f59e0b' },
      { key: 'calendar', label: 'Calendar', href: '/calendar', icon: 'calendar', color: '#8b5cf6' },
      { key: 'ai-chat', label: 'AI Assistant', href: '/ai-chat', icon: 'bot', color: '#0ea5e9' },
    ],
  },
  { section: 'System', items: [{ key: 'admin', label: 'Administration', href: '/admin', icon: 'shield', color: '#64748b' }] },
];
