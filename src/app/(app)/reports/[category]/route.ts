import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Config = { table: string; columns: string[]; label: string };

const REPORTS: Record<string, Config> = {
  operational: { table: 'bookings', columns: ['tracking_no', 'customer_name', 'origin', 'destination', 'type', 'status', 'pickup_date', 'declared_value'], label: 'Shipment Operations Report' },
  financial: { table: 'invoices', columns: ['invoice_no', 'customer_name', 'amount', 'status', 'invoice_date'], label: 'Financial Report' },
  hr: { table: 'employees', columns: ['name', 'department', 'role_title', 'status'], label: 'HR & Careers Report' },
  fleet: { table: 'fleet_vehicles', columns: ['plate', 'type', 'status', 'next_service_date'], label: 'Fleet Management Report' },
  sales: { table: 'leads', columns: ['company', 'contact_name', 'priority', 'status', 'value'], label: 'Sales Report' },
  crm: { table: 'leads', columns: ['company', 'contact_name', 'priority', 'status', 'value'], label: 'CRM & Leads Report' },
  // Confirm these names/columns against the actual Supabase schema.
  customers: { table: 'customers', columns: ['id', 'name', 'email', 'phone', 'status'], label: 'Customer Management Report' },
  drivers: { table: 'drivers', columns: ['id', 'name', 'phone', 'status'], label: 'Driver Management Report' },
  warehouse: { table: 'warehouse_inventory', columns: ['id', 'sku', 'name', 'quantity', 'reorder_level'], label: 'Warehouse & Inventory Report' },
};

function titleCase(key: string) {
  return key.split('_').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' ');
}
function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function csvCell(value: unknown) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  return [columns.map(titleCase).map(csvCell).join(','), ...rows.map(r => columns.map(c => csvCell(r[c])).join(','))].join('\r\n');
}
function toXlsx(rows: Record<string, unknown>[], columns: string[], title: string): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([columns.map(titleCase), ...rows.map(r => columns.map(c => r[c] ?? ''))]);
  sheet['!cols'] = columns.map(c => ({ wch: Math.min(32, Math.max(14, titleCase(c).length + 4)) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
async function toPdf(rows: Record<string, unknown>[], columns: string[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const layout = columns.length > 5 ? 'landscape' : 'portrait';
    const doc = new PDFDocument({ size: 'A4', layout, margin: 32 });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const width = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const widths = () => columns.map(() => width() / Math.max(columns.length, 1));
    const drawHeader = (y: number) => {
      let x = doc.page.margins.left;
      const ws = widths();
      doc.rect(x, y, width(), 22).fill('#dc2626');
      columns.forEach((c, i) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff').text(titleCase(c), x + 4, y + 6, { width: ws[i] - 8, height: 12, ellipsis: true, lineBreak: false });
        x += ws[i];
      });
      return y + 22;
    };
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#111').text('JAAD ERP');
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(12).text(title);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(8).fillColor('#666').text(`Generated ${new Date().toLocaleString()} | ${rows.length} record(s)`);
    doc.moveDown(0.8);
    let y = drawHeader(doc.y);
    rows.forEach((row, index) => {
      if (y + 20 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ size: 'A4', layout, margin: 32 });
        y = drawHeader(doc.page.margins.top);
      }
      if (index % 2 === 0) doc.rect(doc.page.margins.left, y, width(), 20).fill('#f5f5f5');
      let x = doc.page.margins.left;
      const ws = widths();
      columns.forEach((c, i) => {
        doc.font('Helvetica').fontSize(8).fillColor('#222').text(String(row[c] ?? ''), x + 4, y + 6, { width: ws[i] - 8, height: 12, ellipsis: true, lineBreak: false });
        x += ws[i];
      });
      y += 20;
    });
    if (!rows.length) doc.font('Helvetica').fontSize(10).fillColor('#555').text('No records found.', doc.page.margins.left, y + 8);
    doc.end();
  });
}
function toPrintHtml(rows: Record<string, unknown>[], config: Config) {
  const headers = config.columns.map(c => `<th>${escapeHtml(titleCase(c))}</th>`).join('');
  const body = rows.map(row => `<tr>${config.columns.map(c => `<td>${escapeHtml(row[c])}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(config.label)}</title><style>
  body{font:12px Arial,sans-serif;color:#171717;padding:24px}h1{font-size:20px;color:#dc2626;margin-bottom:5px}
  .meta{font-size:11px;color:#666;margin:0 0 16px}table{width:100%;border-collapse:collapse;table-layout:fixed}
  th{background:#dc2626;color:#fff;text-align:left}th,td{border:1px solid #ddd;padding:7px;overflow-wrap:anywhere;text-align:left}
  tr:nth-child(even){background:#f5f5f5}@media print{body{padding:0}h1{color:#111}}
  </style></head><body><h1>JAAD ERP — ${escapeHtml(config.label)}</h1><p class="meta">Generated ${escapeHtml(new Date().toLocaleString())} · ${rows.length} record(s)</p>
  <table><thead><tr>${headers}</tr></thead><tbody>${body || `<tr><td colspan="${config.columns.length}">No records found.</td></tr>`}</tbody></table>
  </body></html>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category: raw } = await params;
  const category = decodeURIComponent(String(raw ?? '')).trim().toLowerCase();
  const config = REPORTS[category];
  if (!config) return NextResponse.json({ error: `Unknown report category "${category}".`, supportedCategories: Object.keys(REPORTS) }, { status: 404 });

  const format = new URL(request.url).searchParams.get('format')?.toLowerCase() || 'csv';
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from(config.table).select(config.columns.join(','));
    if (error) return NextResponse.json({ error: `Database query failed for "${config.table}".`, details: error.message }, { status: 500 });
    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    if (format === 'print') {
      return new NextResponse(toPrintHtml(rows, config), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    if (format === 'pdf') {
      const buffer = await toPdf(rows, config.columns, config.label);
      return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${category}-report.pdf"` } });
    }
    if (format === 'xlsx') {
      const buffer = toXlsx(rows, config.columns, config.label);
      return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${category}-report.xlsx"` } });
    }
    if (format !== 'csv') return NextResponse.json({ error: 'Unsupported report format.' }, { status: 400 });
    return new NextResponse(toCsv(rows, config.columns), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${category}-report.csv"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report generation failed.' }, { status: 500 });
  }
}
