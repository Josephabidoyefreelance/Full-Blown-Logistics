import { createClient } from '@/lib/supabase/server';
import DashboardLiveRefresh from './live-refresh';

type StatusCount = Record<string, number>;

function countStatuses(rows: Array<{ status?: string | null }>, statuses: string[]) {
  const counts: StatusCount = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const row of rows) {
    const status = String(row.status ?? '');
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

function Icon({
  name,
  size = 20,
}: {
  name: 'shipment' | 'revenue' | 'fleet' | 'delivery' | 'plus' | 'customer' | 'finance' | 'reports' | 'arrow' | 'driver' | 'warehouse';
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'shipment') {
    return (
      <svg {...common}>
        <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
        <path d="M3 7.5V17l9 4 9-4V7.5" />
        <path d="M12 12v9" />
        <path d="m7.5 5.25 9 4.5" />
      </svg>
    );
  }

  if (name === 'revenue' || name === 'finance') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 14h3" />
      </svg>
    );
  }

  if (name === 'fleet') {
    return (
      <svg {...common}>
        <path d="M3 6h11v10H3z" />
        <path d="M14 9h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  }

  if (name === 'delivery') {
    return (
      <svg {...common}>
        <path d="M4 17V9" />
        <path d="M9 17v-5" />
        <path d="M14 17V7" />
        <path d="M19 17V4" />
        <path d="m4 7 5-3 5 2 5-2" />
      </svg>
    );
  }

  if (name === 'plus') {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === 'customer') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.7-3.2 3-5 7-5s6.3 1.8 7 5" />
      </svg>
    );
  }

  if (name === 'reports') {
    return (
      <svg {...common}>
        <path d="M5 19V9" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
        <path d="M3 19h18" />
      </svg>
    );
  }

  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === 'driver') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-3.4 3.1-5 7-5s6.2 1.6 7 5" />
        <path d="M18 5.5 20 7l-2 1.5" />
      </svg>
    );
  }

  if (name === 'warehouse') {
    return (
      <svg {...common}>
        <path d="M3 10 12 4l9 6v9H3z" />
        <path d="M7 19v-5h10v5" />
        <path d="M7 10h10" />
      </svg>
    );
  }

  return null;
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  tone,
  badge,
}: {
  icon: 'shipment' | 'revenue' | 'fleet' | 'delivery';
  title: string;
  value: string;
  subtitle: string;
  tone: 'red' | 'green' | 'blue' | 'purple';
  badge?: string;
}) {
  const styles = {
    red: {
      icon: 'bg-red-50 text-red-600',
      hover: 'hover:border-red-300 hover:bg-red-50/40',
    },
    green: {
      icon: 'bg-emerald-50 text-emerald-600',
      hover: 'hover:border-emerald-300 hover:bg-emerald-50/40',
    },
    blue: {
      icon: 'bg-blue-50 text-blue-600',
      hover: 'hover:border-blue-300 hover:bg-blue-50/40',
    },
    purple: {
      icon: 'bg-purple-50 text-purple-600',
      hover: 'hover:border-purple-300 hover:bg-purple-50/40',
    },
  }[tone];

  return (
    <div
      className={`group rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${styles.hover}`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.icon}`}>
          <Icon name={icon} size={17} />
        </div>
        {badge ? (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
            {badge}
          </span>
        ) : (
          <span className="text-neutral-300 transition-transform group-hover:translate-x-1 dark:text-neutral-700">
            <Icon name="arrow" size={15} />
          </span>
        )}
      </div>

      <div className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{subtitle}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  tone,
}: {
  href: string;
  icon: 'plus' | 'customer' | 'finance' | 'reports';
  title: string;
  subtitle: string;
  tone: 'red' | 'blue' | 'green' | 'purple';
}) {
  const colors = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  }[tone];

  return (
    <a
      href={href}
      className="group flex min-w-0 items-center gap-3 border-r border-neutral-200 px-4 py-3 transition-colors last:border-r-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </span>
        <span className="block truncate text-[10px] text-neutral-400">{subtitle}</span>
      </span>
      <span className="ml-auto text-neutral-300 transition-transform group-hover:translate-x-1">
        <Icon name="arrow" size={14} />
      </span>
    </a>
  );
}

function StatusCell({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'amber' | 'blue' | 'purple' | 'green' | 'gray';
}) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-neutral-100 text-neutral-500',
  }[tone];

  return (
    <div className="group flex-1 border-r border-neutral-200 px-4 py-3 transition-colors last:border-r-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
      <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${colors}`}>
        <Icon name="shipment" size={14} />
      </div>
      <div className="text-xl font-bold text-neutral-950 dark:text-white">{value}</div>
      <div className="mt-0.5 text-[10px] text-neutral-500">{label}</div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: 'green' | 'blue' | 'amber' | 'purple';
}) {
  const width = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const colors = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  }[tone];

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={`h-full rounded-full ${colors}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}


function DonutChartSvg({
  total,
  segments,
}: {
  total: number;
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const size = 170;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[170px] w-[170px] shrink-0">
        <svg viewBox="0 0 170 170" className="h-full w-full -rotate-90">
          <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="22" />
          {segments.map((segment) => {
            const value = Math.max(0, Number(segment.value || 0));
            const length = total > 0 ? (value / total) * circumference : 0;
            const dash = `${length} ${Math.max(0, circumference - length)}`;
            const currentOffset = offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                cx="85"
                cy="85"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="22"
                strokeDasharray={dash}
                strokeDashoffset={-currentOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-neutral-950 dark:text-white">{total}</span>
          <span className="text-[9px] uppercase tracking-wide text-neutral-400">Total</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{segment.label}</span>
            <span className="font-semibold text-neutral-900 dark:text-white">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({
  labels,
  values,
  color,
  suffix = '',
}: {
  labels: string[];
  values: number[];
  color: string;
  suffix?: string;
}) {
  const width = 640;
  const height = 230;
  const padX = 38;
  const padTop = 18;
  const padBottom = 38;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = labels.length <= 1 ? width / 2 : padX + (index / (labels.length - 1)) * chartW;
    const y = padTop + chartH - (value / max) * chartH;
    return { x, y, value };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L ${points[points.length - 1]?.x ?? width / 2} ${padTop + chartH} L ${points[0]?.x ?? width / 2} ${padTop + chartH} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full" preserveAspectRatio="none">
        {[0, 1, 2, 3].map((step) => {
          const y = padTop + (chartH / 3) * step;
          return <line key={step} x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        <path d={area} fill={color} opacity="0.08" />
        <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${labels[index]}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="white" stroke={color} strokeWidth="3" />
            <text x={point.x} y={height - 14} textAnchor="middle" fontSize="10" fill="#737373">
              {labels[index]}
            </text>
            <text x={point.x} y={Math.max(12, point.y - 10)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#404040">
              {point.value}{suffix}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BarChart({
  labels,
  values,
  color,
}: {
  labels: string[];
  values: number[];
  color: string;
}) {
  const width = 640;
  const height = 230;
  const padX = 38;
  const padTop = 18;
  const padBottom = 40;
  const chartH = height - padTop - padBottom;
  const max = Math.max(1, ...values);
  const slot = (width - padX * 2) / Math.max(1, values.length);
  const barW = Math.min(46, slot * 0.55);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full" preserveAspectRatio="none">
        {[0, 1, 2, 3].map((step) => {
          const y = padTop + (chartH / 3) * step;
          return <line key={step} x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        {values.map((value, index) => {
          const x = padX + slot * index + (slot - barW) / 2;
          const barH = (value / max) * chartH;
          const y = padTop + chartH - barH;
          return (
            <g key={`${labels[index]}-${index}`}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" fill={color} opacity="0.9" />
              <text x={x + barW / 2} y={Math.max(12, y - 7)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#404040">
                {value}
              </text>
              <text x={x + barW / 2} y={height - 14} textAnchor="middle" fontSize="10" fill="#737373">
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'overview' } = await searchParams;
  const activeView = view === 'analytics' ? 'analytics' : 'overview';
  const supabase = await createClient();

  // The dashboard is operational only. Financial amounts are deliberately not
  // queried here; revenue and expenses belong exclusively to the Finance module.
  const [bookings, fleet, leads, drivers, tickets, customers, inventory] = await Promise.all([
    supabase.from('bookings').select('status, created_at'),
    supabase.from('fleet_vehicles').select('status'),
    supabase.from('leads').select('priority'),
    supabase.from('drivers').select('status'),
    supabase.from('tickets').select('status'),
    supabase.from('customers').select('id, status'),
    supabase.from('inventory_items').select('id, qty, reorder_level, location'),
  ]);

  const shipmentRows = bookings.data ?? [];
  const fleetRows = fleet.data ?? [];
  const leadRows = leads.data ?? [];
  const driverRows = drivers.data ?? [];
  const ticketRows = tickets.data ?? [];
  const customerRows = customers.data ?? [];
  const inventoryRows = inventory.data ?? [];
  const lowStockCount = inventoryRows.filter((item) => Number(item.qty ?? 0) < 35).length;
  const warehouseUnits = inventoryRows.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
  const warehouseReorderQueue = inventoryRows.filter((item) => Number(item.reorder_level ?? 0) > 0 && Number(item.qty ?? 0) <= Number(item.reorder_level ?? 0)).length;
  const warehouseLocations = new Set(inventoryRows.map((item) => item.location).filter(Boolean)).size;

  const shipmentCounts = countStatuses(
    shipmentRows,
    ['Pending', 'Assigned', 'In Transit', 'Delivered', 'Cancelled'],
  );

  const fleetCounts = countStatuses(
    fleetRows,
    ['Available', 'In Transit', 'Maintenance', 'Out of service', 'Idle'],
  );

  const driverCounts = countStatuses(driverRows, ['Available', 'On trip', 'Off duty']);
  const ticketCounts = countStatuses(ticketRows, ['Open', 'Resolved']);
  const availableDrivers = driverCounts.Available ?? 0;
  const activeFleet = (fleetCounts.Available ?? 0) + (fleetCounts['In Transit'] ?? 0);

  const leadCounts: StatusCount = { Hot: 0, Warm: 0, Cold: 0 };
  for (const lead of leadRows) {
    const priority = String(lead.priority ?? '');
    if (priority in leadCounts) leadCounts[priority] += 1;
  }

  const totalShipments = shipmentRows.length;
  const delivered = shipmentCounts.Delivered ?? 0;
  const activeShipments =
    (shipmentCounts.Pending ?? 0) +
    (shipmentCounts.Assigned ?? 0) +
    (shipmentCounts['In Transit'] ?? 0);

  const deliveryRate = totalShipments > 0 ? Math.round((delivered / totalShipments) * 100) : 0;

  const now = new Date();
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthLabels = monthKeys.map((key) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  });
  const shipmentTrend = monthKeys.map((key) =>
    shipmentRows.filter((row) => String(row.created_at ?? '').slice(0, 7) === key).length,
  );
  const deliveredTrend = monthKeys.map((key) =>
    shipmentRows.filter(
      (row) => String(row.created_at ?? '').slice(0, 7) === key && row.status === 'Delivered',
    ).length,
  );
  const deliveryRateTrend = monthKeys.map((key) => {
    const monthRows = shipmentRows.filter((row) => String(row.created_at ?? '').slice(0, 7) === key);
    const monthDelivered = monthRows.filter((row) => row.status === 'Delivered').length;
    return monthRows.length ? Math.round((monthDelivered / monthRows.length) * 100) : 0;
  });

  return (
    <>
      <DashboardLiveRefresh />

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">
                System Online
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Real-time overview of your logistics operations, finance and business performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/dashboard?view=overview"
              className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${
                activeView === 'overview'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-500 text-white hover:bg-red-700'
              }`}
            >
              Overview
            </a>
            <a
              href="/dashboard?view=analytics"
              className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${
                activeView === 'analytics'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-500 text-white hover:bg-red-700'
              }`}
            >
              Analytics
            </a>
          </div>
        </div>

        {activeView === 'overview' ? (
          <>
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Operations modules</h2>
                  <p className="text-[10px] text-neutral-400">Live control points across the ERP.</p>
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600">Live</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <a href="/crm" className="group rounded-xl border border-neutral-200 p-3.5 transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md dark:border-neutral-800 dark:hover:border-red-900/60">
                  <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><Icon name="customer" size={18} /></span><Icon name="arrow" size={14} /></div>
                  <p className="mt-3 text-xs font-bold text-neutral-900 dark:text-white">CRM & Customer Management</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">Customers, leads and follow-up.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Customers</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{customerRows.length}</span></div><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Leads</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{leadRows.length}</span></div></div>
                </a>

                <a href="/shipments" className="group rounded-xl border border-neutral-200 p-3.5 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:hover:border-blue-900/60">
                  <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon name="shipment" size={18} /></span><Icon name="arrow" size={14} /></div>
                  <p className="mt-3 text-xs font-bold text-neutral-900 dark:text-white">Shipment & Fleet</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">Movement, delivery and vehicles.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Active shipments</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{activeShipments}</span></div><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Active fleet</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{activeFleet}</span></div></div>
                </a>

                <a href="/drivers" className="group rounded-xl border border-neutral-200 p-3.5 transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md dark:border-neutral-800 dark:hover:border-purple-900/60">
                  <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><Icon name="driver" size={18} /></span><Icon name="arrow" size={14} /></div>
                  <p className="mt-3 text-xs font-bold text-neutral-900 dark:text-white">Driver Management</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">Availability and active trips.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Total drivers</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{driverRows.length}</span></div><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Available</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{availableDrivers}</span></div></div>
                </a>

                <a href="/warehouse" className="group rounded-xl border border-neutral-200 p-3.5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-neutral-800 dark:hover:border-amber-900/60">
                  <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Icon name="warehouse" size={18} /></span><Icon name="arrow" size={14} /></div>
                  <p className="mt-3 text-xs font-bold text-neutral-900 dark:text-white">Warehouse</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">Inventory and stock control.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Items</span><span className="text-sm font-bold text-neutral-900 dark:text-white">{inventoryRows.length}</span></div><div className="rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60"><span className="block text-[9px] text-neutral-400">Low stock</span><span className={`text-sm font-bold ${lowStockCount ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount}</span></div></div>
                </a>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Quick Actions</h2>
                <p className="text-[10px] text-neutral-400">Common operational actions</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <QuickAction
                  href="/shipments"
                  icon="plus"
                  title="New Shipment"
                  subtitle="Create booking"
                  tone="red"
                />
                <QuickAction
                  href="/customers"
                  icon="customer"
                  title="Customers"
                  subtitle="Manage customers"
                  tone="blue"
                />
                <QuickAction
                  href="/finance"
                  icon="finance"
                  title="Finance"
                  subtitle="Payments & invoices"
                  tone="green"
                />
                <QuickAction
                  href="/reports"
                  icon="reports"
                  title="Reports"
                  subtitle="Business analytics"
                  tone="purple"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <div>
                  <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Shipment Operations
                  </h2>
                  <p className="text-[10px] text-neutral-400">Current shipment pipeline</p>
                </div>
                <a
                  href="/shipments"
                  className="text-[10px] font-semibold text-red-600 hover:text-red-700"
                >
                  View all
                </a>
              </div>

              <div className="flex flex-col sm:flex-row">
                <StatusCell value={shipmentCounts.Pending ?? 0} label="Pending" tone="amber" />
                <StatusCell value={shipmentCounts.Assigned ?? 0} label="Assigned" tone="blue" />
                <StatusCell
                  value={shipmentCounts['In Transit'] ?? 0}
                  label="In Transit"
                  tone="purple"
                />
                <StatusCell value={shipmentCounts.Delivered ?? 0} label="Delivered" tone="green" />
                <StatusCell
                  value={shipmentCounts.Cancelled ?? 0}
                  label="Cancelled"
                  tone="gray"
                />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                  Operations Snapshot
                </h2>
                <p className="mb-4 text-[10px] text-neutral-400">Operational workload at a glance</p>
                <ProgressRow
                  label="Delivered"
                  value={shipmentCounts.Delivered ?? 0}
                  total={totalShipments}
                  tone="green"
                />
                <ProgressRow
                  label="In Transit"
                  value={shipmentCounts['In Transit'] ?? 0}
                  total={totalShipments}
                  tone="blue"
                />
                <ProgressRow
                  label="Assigned"
                  value={shipmentCounts.Assigned ?? 0}
                  total={totalShipments}
                  tone="purple"
                />
                <ProgressRow
                  label="Pending"
                  value={shipmentCounts.Pending ?? 0}
                  total={totalShipments}
                  tone="amber"
                />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Warehouse Overview</h2>
                    <p className="text-[10px] text-neutral-400">Inventory and stock control</p>
                  </div>
                  <a href="/warehouse" className="text-[10px] font-semibold text-red-600 hover:text-red-700">
                    Manage
                  </a>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                    <div className="text-[9px] text-neutral-400">Inventory items</div>
                    <div className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{inventoryRows.length}</div>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                    <div className="text-[9px] text-neutral-400">Units in stock</div>
                    <div className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{warehouseUnits}</div>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                    <div className="text-[9px] text-neutral-400">Low stock</div>
                    <div className={`mt-1 text-xl font-bold ${lowStockCount ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount}</div>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                    <div className="text-[9px] text-neutral-400">Reorder queue</div>
                    <div className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{warehouseReorderQueue}</div>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-neutral-400">
                  {warehouseLocations} active location{warehouseLocations === 1 ? '' : 's'} represented in inventory.
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                      Fleet Management
                    </h2>
                    <p className="text-[10px] text-neutral-400">Vehicle availability</p>
                  </div>
                  <a href="/fleet" className="text-[10px] font-semibold text-red-600 hover:text-red-700">
                    Manage
                  </a>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon name="fleet" size={20} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-neutral-950 dark:text-white">
                      {fleetRows.length}
                    </div>
                    <div className="text-[10px] text-neutral-400">Total vehicles</div>
                  </div>
                </div>

                <div className="mt-4">
                  <ProgressRow
                    label="Available"
                    value={fleetCounts.Available ?? 0}
                    total={fleetRows.length}
                    tone="green"
                  />
                  <ProgressRow
                    label="In Transit"
                    value={fleetCounts['In Transit'] ?? 0}
                    total={fleetRows.length}
                    tone="blue"
                  />
                  <ProgressRow
                    label="Maintenance"
                    value={fleetCounts.Maintenance ?? 0}
                    total={fleetRows.length}
                    tone="amber"
                  />
                  <ProgressRow
                    label="Idle"
                    value={fleetCounts.Idle ?? 0}
                    total={fleetRows.length}
                    tone="purple"
                  />
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1">
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Analytics</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Visual trends and operational performance across the ERP.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm min-h-[300px] dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Shipment Volume Trend</h3>
                    <p className="text-[10px] text-neutral-400">Shipments created over the last 6 months.</p>
                  </div>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-red-600">Live</span>
                </div>
                <TrendChart labels={monthLabels} values={shipmentTrend} color="#dc2626" />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm min-h-[300px] dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Delivery Performance</h3>
                    <p className="text-[10px] text-neutral-400">Monthly delivered percentage from shipment records.</p>
                  </div>
                  <span className="rounded-full bg-purple-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-purple-600">Trend</span>
                </div>
                <TrendChart labels={monthLabels} values={deliveryRateTrend} color="#9333ea" suffix="%" />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm min-h-[300px] dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Delivered Shipments</h3>
                  <p className="text-[10px] text-neutral-400">Monthly delivery output.</p>
                </div>
                <BarChart labels={monthLabels} values={deliveredTrend} color="#16a34a" />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm min-h-[300px] dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Shipment Status Mix</h3>
                  <p className="text-[10px] text-neutral-400">Current operational pipeline.</p>
                </div>
                <DonutChartSvg
                  total={totalShipments}
                  segments={[
                    { label: 'Pending', value: shipmentCounts.Pending ?? 0, color: '#f59e0b' },
                    { label: 'Assigned', value: shipmentCounts.Assigned ?? 0, color: '#3b82f6' },
                    { label: 'In Transit', value: shipmentCounts['In Transit'] ?? 0, color: '#8b5cf6' },
                    { label: 'Delivered', value: shipmentCounts.Delivered ?? 0, color: '#16a34a' },
                    { label: 'Cancelled', value: shipmentCounts.Cancelled ?? 0, color: '#6b7280' },
                  ]}
                />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Fleet Availability</h3>
                  <p className="text-[10px] text-neutral-400">Current vehicle status.</p>
                </div>
                <DonutChartSvg
                  total={fleetRows.length}
                  segments={[
                    { label: 'Available', value: fleetCounts.Available ?? 0, color: '#16a34a' },
                    { label: 'In Transit', value: fleetCounts['In Transit'] ?? 0, color: '#3b82f6' },
                    { label: 'Maintenance', value: fleetCounts.Maintenance ?? 0, color: '#f59e0b' },
                    { label: 'Out of service', value: fleetCounts['Out of service'] ?? 0, color: '#dc2626' },
                    { label: 'Idle', value: fleetCounts.Idle ?? 0, color: '#6b7280' },
                  ]}
                />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Lead Pipeline</h3>
                  <p className="text-[10px] text-neutral-400">Current leads by priority.</p>
                </div>
                <DonutChartSvg
                  total={leadRows.length}
                  segments={[
                    { label: 'Hot', value: leadCounts.Hot, color: '#dc2626' },
                    { label: 'Warm', value: leadCounts.Warm, color: '#f59e0b' },
                    { label: 'Cold', value: leadCounts.Cold, color: '#3b82f6' },
                  ]}
                />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Driver Availability</h3>
                  <p className="text-[10px] text-neutral-400">Current driver workload.</p>
                </div>
                <DonutChartSvg
                  total={driverRows.length}
                  segments={[
                    { label: 'Available', value: driverCounts.Available ?? 0, color: '#16a34a' },
                    { label: 'On trip', value: driverCounts['On trip'] ?? 0, color: '#3b82f6' },
                    { label: 'Off duty', value: driverCounts['Off duty'] ?? 0, color: '#6b7280' },
                  ]}
                />
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Support Workload</h3>
                  <p className="text-[10px] text-neutral-400">Open versus resolved support tickets.</p>
                </div>
                <DonutChartSvg
                  total={ticketRows.length}
                  segments={[
                    { label: 'Open', value: ticketCounts.Open ?? 0, color: '#f59e0b' },
                    { label: 'Resolved', value: ticketCounts.Resolved ?? 0, color: '#16a34a' },
                  ]}
                />
              </section>
            </div>

            <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Icon name="finance" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Financial Performance</h3>
                  <p className="mt-1 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">
                    Revenue, expenses and profit trends are protected and remain inside the Finance module. This dashboard intentionally does not expose company financial totals to general operational users.
                  </p>
                  <a href="/finance" className="mt-2 inline-block text-[10px] font-bold text-red-600 hover:text-red-700">
                    Open Finance analytics →
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
