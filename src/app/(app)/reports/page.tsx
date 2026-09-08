const CATEGORIES = [
  { key: 'operational', name: 'Operational', desc: 'Bookings, dispatch performance, on-time rate.' },
  { key: 'financial', name: 'Financial', desc: 'Revenue, expenses, receivables, VAT summary.' },
  { key: 'hr', name: 'HR', desc: 'Headcount, attendance, leave balances.' },
  { key: 'fleet', name: 'Fleet', desc: 'Utilization, maintenance, fuel spend.' },
  { key: 'sales', name: 'Sales', desc: 'Pipeline, conversion, campaign performance.' },
];

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Reports</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Operational, financial, HR, fleet and sales exports.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</div>
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">{c.desc}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/reports/${c.key}`}
                className="inline-block rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                CSV
              </a>
              <a
                href={`/api/reports/${c.key}?format=xlsx`}
                className="inline-block rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Excel
              </a>
              <a
                href={`/api/reports/${c.key}?format=pdf`}
                className="inline-block rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
