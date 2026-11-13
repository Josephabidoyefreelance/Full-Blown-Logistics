'use client';

type Customer = {
  name: string;
  type: string;
  contact: string | null;
  credit_limit: number;
  balance: number | null;
  status: string;
  client_since: string | null;
};

function csvEscape(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ExportCustomersButton({ customers }: { customers: Customer[] }) {
  function handleExport() {
    const headers = ['Account', 'Type', 'Contact', 'Credit limit', 'Balance', 'Since', 'Status'];
    const rows = customers.map((c) => [
      c.name,
      c.type,
      c.contact ?? '',
      String(c.credit_limit ?? 0),
      String(c.balance ?? 0),
      c.client_since ?? '',
      c.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      Export CSV
    </button>
  );
}
