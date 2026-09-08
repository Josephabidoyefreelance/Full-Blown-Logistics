'use client';

import DonutChart from './donut-chart';
import BarChart from './bar-chart';

type Props = {
  customerName: string | null;
  currency: string;
  symbol: string;
  revenue: number;
  tax: number;
  income: number;
  shippingFee: number;
};

export default function ReportTab({
  customerName,
  currency,
  symbol,
  revenue,
  tax,
  income,
  shippingFee,
}: Props) {
  const profit = income;
  const expenses = shippingFee;

  function buildRows(): string[][] {
    const rows: string[][] = [];
    rows.push(['Financial report', customerName ?? 'Customer']);
    rows.push(['Generated', new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })]);
    rows.push(['Currency', currency]);
    rows.push([]);
    rows.push(['Revenue', `${symbol}${revenue}`]);
    rows.push(['Tax (7.5%)', `${symbol}${tax}`]);
    rows.push(['Profit', `${symbol}${profit}`]);
    rows.push(['Shipping paid to JAAD (NGN)', `\u20a6${shippingFee}`]);
    rows.push(['Expenses (NGN)', `\u20a6${expenses}`]);
    return rows;
  }

  function toCsvString(rows: string[][]) {
    return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  function downloadBlob(content: string, mime: string, filename: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadXLS() {
    const csv = toCsvString(buildRows());
    downloadBlob(csv, 'application/vnd.ms-excel', `financial-report-${new Date().toISOString().slice(0, 10)}.xls`);
  }

  function handleDownloadCSV() {
    const csv = toCsvString(buildRows());
    downloadBlob(csv, 'text/csv', `financial-report-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const cards: [string, number, string][] = [
    ['Revenue', revenue, '#2563c7'],
    ['Tax', tax, '#ca8a04'],
    ['Profit', profit, '#1f9d5c'],
    ['Shipping', shippingFee, '#7c3aed'],
    ['Expenses', expenses, '#e2362b'],
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 print:border-0 print:bg-white print:text-black">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Financial report</h1>
          <p className="text-[12px] text-[var(--subtext)]">
            {new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} &middot; {currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            Download PDF
          </button>
          <button
            onClick={handleDownloadXLS}
            className="rounded-sm border border-[var(--input-border)] px-5 py-2.5 text-[13px] font-bold text-[var(--text)] hover:bg-[var(--input-bg)]"
          >
            Download XLS
          </button>
          <button
            onClick={handleDownloadCSV}
            className="rounded-sm border border-[var(--input-border)] px-5 py-2.5 text-[13px] font-bold text-[var(--text)] hover:bg-[var(--input-bg)]"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="mb-2 hidden print:block">
        <h1 className="text-xl font-bold text-black">Financial report</h1>
        <p className="text-[12px] text-neutral-500">
          {new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} &middot; {currency}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value, color]) => (
          <div
            key={label}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-b from-[var(--input-bg)] to-transparent shadow-sm transition-shadow hover:shadow-md print:border-neutral-300 print:shadow-none"
            style={{ borderLeft: `4px solid ${color}` }}
          >
            <div className="p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--subtext)] print:text-neutral-500">
                {label}
              </div>
              <div className="mt-1.5 text-[26px] font-bold leading-tight print:text-black" style={{ color }}>
                {label === 'Shipping' || label === 'Expenses' ? '\u20a6' : symbol}
                {value.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          title="Revenue vs tax vs shipping"
          total={revenue + shippingFee}
          segments={[
            { label: 'Profit', value: Math.max(profit, 0), color: '#1f9d5c' },
            { label: 'Tax', value: tax, color: '#ca8a04' },
            { label: 'Shipping paid', value: shippingFee, color: '#7c3aed' },
          ]}
        />
        <BarChart
          title="Money breakdown"
          bars={[
            { label: 'Revenue', value: revenue, color: '#2563c7' },
            { label: 'Tax', value: tax, color: '#ca8a04' },
            { label: 'Profit', value: profit, color: '#1f9d5c' },
            { label: 'Shipping paid', value: shippingFee, color: '#7c3aed' },
            { label: 'Expenses', value: expenses, color: '#e2362b' },
          ]}
        />
      </div>
    </div>
  );
}
