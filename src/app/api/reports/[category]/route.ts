import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const TABLES: Record<string, { table: string; columns: string[]; label: string }> = {
  operational: { table: 'bookings', columns: ['tracking_no', 'customer_name', 'origin', 'destination', 'type', 'status', 'pickup_date', 'declared_value'], label: 'Operational Report' },
  financial: { table: 'invoices', columns: ['invoice_no', 'customer_name', 'amount', 'status', 'invoice_date'], label: 'Financial Report' },
  hr: { table: 'employees', columns: ['name', 'department', 'role_title', 'status'], label: 'HR Report' },
  fleet: { table: 'fleet_vehicles', columns: ['plate', 'type', 'status', 'next_service_date'], label: 'Fleet Report' },
  sales: { table: 'leads', columns: ['company', 'contact_name', 'priority', 'status', 'value'], label: 'Sales Report' },
};

function columnLabel(key: string) {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(r[c])).join(',')));
  return lines.join('\n');
}

function toXlsxBuffer(rows: Record<string, unknown>[], columns: string[], sheetTitle: string): Buffer {
  const headerRow = columns.map(columnLabel);
  const dataRows = rows.map((r) => columns.map((c) => r[c] ?? ''));
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map(() => ({ wch: 20 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function toPrintableHtml(rows: Record<string, unknown>[], columns: string[], title: string): string {
  const headers = columns.map((c) => `<th>${columnLabel(c)}</th>`).join('');
  const bodyRows = rows.map((r) =>
    `<tr>${columns.map((c) => `<td>${String(r[c] ?? '')}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
  h1 { font-size: 16px; margin-bottom: 4px; color: #111; }
  p { color: #666; font-size: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #dc2626; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) td { background: #f9f9f9; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p>Generated ${new Date().toLocaleString()} &mdash; ${rows.length} record(s)</p>
<table>
  <thead><tr>${headers}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const config = TABLES[category];
  if (!config) {
    return NextResponse.json({ error: 'Unknown report category' }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get('format') ?? 'csv';

  const supabase = await createClient();
  const { data, error } = await supabase.from(config.table).select(config.columns.join(','));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  if (format === 'pdf') {
    const html = toPrintableHtml(rows, config.columns, config.label);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }

  if (format === 'xlsx') {
    const xlsxBuffer = toXlsxBuffer(rows, config.columns, config.label);
    return new NextResponse(xlsxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${category}-report.xlsx"`,
      },
    });
  }

  const csv = toCsv(rows, config.columns);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${category}-report.csv"`,
    },
  });
}
