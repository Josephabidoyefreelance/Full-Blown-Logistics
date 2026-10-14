import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

/**
 * IMPORTANT:
 * These mappings are based on the table/column names in the supplied route file.
 * Additional modules need their real Supabase table and column names confirmed
 * before they can safely be exported. Do not silently guess production schema.
 */
const TABLES: Record<string, { table: string; columns: string[]; label: string }> = {
  operational: { table: 'bookings', columns: ['tracking_no', 'customer_name', 'origin', 'destination', 'type', 'status', 'pickup_date', 'declared_value'], label: 'Shipment Operations Report' },
  financial: { table: 'invoices', columns: ['invoice_no', 'customer_name', 'amount', 'status', 'invoice_date'], label: 'Financial Report' },
  hr: { table: 'employees', columns: ['name', 'department', 'role_title', 'status'], label: 'HR Report' },
  fleet: { table: 'fleet_vehicles', columns: ['plate', 'type', 'status', 'next_service_date'], label: 'Fleet Report' },
  sales: { table: 'leads', columns: ['company', 'contact_name', 'priority', 'status', 'value'], label: 'Sales Report' },

  // Confirm these table names/columns against the project's Supabase schema before use.
  crm: { table: 'leads', columns: ['company', 'contact_name', 'priority', 'status', 'value'], label: 'CRM & Leads Report' },
  customers: { table: 'customers', columns: ['id', 'name', 'email', 'phone', 'status'], label: 'Customer Management Report' },
  drivers: { table: 'drivers', columns: ['id', 'name', 'phone', 'status'], label: 'Driver Management Report' },
  warehouse: { table: 'warehouse_inventory', columns: ['id', 'sku', 'name', 'quantity', 'reorder_level'], label: 'Warehouse & Inventory Report' },
};

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const esc = (value: unknown) => {
    const s = String(value ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(','), ...rows.map(row => columns.map(c => esc(row[c])).join(','))].join('\r\n');
}

function columnLabel(key: string) {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function toPdfBuffer(rows: Record<string, unknown>[], columns: string[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: columns.length > 5 ? 'landscape' : 'portrait', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const drawTableHeader = (x: number, y: number, widths: number[]) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      doc.rect(x, y, pageWidth(), 22).fill('#dc2626');
      let cx = x;
      columns.forEach((col, i) => {
        doc.fillColor('#ffffff').text(columnLabel(col), cx + 4, y + 6, { width: widths[i] - 8, height: 12, ellipsis: true, lineBreak: false });
        cx += widths[i];
      });
      return y + 22;
    };

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111').text('JAAD ERP', { continued: false });
    doc.moveDown(0.2);
    doc.fontSize(13).text(title);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(8).fillColor('#666666').text(`Generated ${new Date().toLocaleString()} | ${rows.length} record(s)`);
    doc.moveDown(0.8);

    const widths = columns.map(() => pageWidth() / Math.max(columns.length, 1));
    let x = doc.page.margins.left;
    let y = drawTableHeader(x, doc.y, widths);
    const rowHeight = 20;

    rows.forEach((row, idx) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ margin: 30, size: 'A4', layout: columns.length > 5 ? 'landscape' : 'portrait' });
        x = doc.page.margins.left;
        y = drawTableHeader(x, doc.page.margins.top, widths);
      }
      if (idx % 2 === 0) doc.rect(x, y, pageWidth(), rowHeight).fill('#f5f5f5');
      doc.font('Helvetica').fontSize(8).fillColor('#222222');
      let cx = x;
      columns.forEach((col, i) => {
        doc.text(String(row[col] ?? ''), cx + 4, y + 6, { width: widths[i] - 8, height: 12, ellipsis: true, lineBreak: false });
        cx += widths[i];
      });
      y += rowHeight;
    });

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#555555').text('No records found for this report.', x, y + 8);
    }
    doc.end();
  });
}

function toXlsxBuffer(rows: Record<string, unknown>[], columns: string[], sheetTitle: string): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([columns.map(columnLabel), ...rows.map(row => columns.map(c => row[c] ?? ''))]);
  worksheet['!cols'] = columns.map(col => ({ wch: Math.min(Math.max(columnLabel(col).length + 4, 16), 30) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function fetchRows(category: string) {
  const config = TABLES[category];
  if (!config) throw new Error(`Unknown report category: ${category}`);
  const supabase = await createClient();
  const { data, error } = await supabase.from(config.table).select(config.columns.join(','));
  if (error) throw new Error(`${config.table}: ${error.message}`);
  return { config, rows: (data ?? []) as unknown as Record<string, unknown>[] };
}

export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const format = new URL(request.url).searchParams.get('format') ?? 'csv';

  try {
    const { config, rows } = await fetchRows(category);

    if (format === 'print') {
      const htmlEscape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[ch] as string));
      const headers = config.columns.map(c => `<th>${htmlEscape(columnLabel(c))}</th>`).join('');
      const body = rows.map(row => `<tr>${config.columns.map(c => `<td>${htmlEscape(row[c])}</td>`).join('')}</tr>`).join('');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(config.label)}</title><style>
        body{font:12px Arial,sans-serif;color:#111;padding:24px}h1{color:#dc2626;font-size:20px}
        .meta{color:#666;margin-bottom:18px}table{width:100%;border-collapse:collapse;table-layout:fixed}
        th{background:#dc2626;color:white;text-align:left}th,td{padding:7px;border:1px solid #ddd;overflow-wrap:anywhere}
        tr:nth-child(even){background:#f5f5f5}@media print{body{padding:0}h1{color:#111}}
      </style></head><body><h1>JAAD ERP — ${htmlEscape(config.label)}</h1><div class="meta">Generated ${htmlEscape(new Date().toLocaleString())} · ${rows.length} record(s)</div><table><thead><tr>${headers}</tr></thead><tbody>${body || `<tr><td colspan="${config.columns.length}">No records found.</td></tr>`}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (format === 'pdf') {
      const buffer = await toPdfBuffer(rows, config.columns, config.label);
      return new NextResponse(new Uint8Array(buffer), { headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${category}-report.pdf"`,
      }});
    }
    if (format === 'xlsx') {
      const buffer = toXlsxBuffer(rows, config.columns, config.label);
      return new NextResponse(new Uint8Array(buffer), { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${category}-report.xlsx"`,
      }});
    }
    if (format !== 'csv') return NextResponse.json({ error: 'Unsupported report format.' }, { status: 400 });

    return new NextResponse(toCsv(rows, config.columns), { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${category}-report.csv"`,
    }});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report generation failed.' }, { status: 500 });
  }
}
