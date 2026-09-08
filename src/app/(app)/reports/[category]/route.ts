import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const TABLES: Record<string, { table: string; columns: string[]; label: string }> = {
  operational: { table: 'bookings', columns: ['tracking_no', 'customer_name', 'origin', 'destination', 'type', 'status', 'pickup_date', 'declared_value'], label: 'Operational Report' },
  financial: { table: 'invoices', columns: ['invoice_no', 'customer_name', 'amount', 'status', 'invoice_date'], label: 'Financial Report' },
  hr: { table: 'employees', columns: ['name', 'department', 'role_title', 'status'], label: 'HR Report' },
  fleet: { table: 'fleet_vehicles', columns: ['plate', 'type', 'status', 'next_service_date'], label: 'Fleet Report' },
  sales: { table: 'leads', columns: ['company', 'contact_name', 'priority', 'status', 'value'], label: 'Sales Report' },
};

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(r[c])).join(',')));
  return lines.join('\n');
}

function columnLabel(key: string) {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function toPdfBuffer(rows: Record<string, unknown>[], columns: string[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: columns.length > 5 ? 'landscape' : 'portrait' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(`Generated ${new Date().toLocaleString()} — ${rows.length} record(s)`);
    doc.moveDown(1);

    const startX = doc.x;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / columns.length;
    const rowHeight = 20;

    function drawHeader(y: number) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff');
      doc.rect(startX, y, pageWidth, rowHeight).fill('#dc2626');
      doc.fillColor('#fff');
      columns.forEach((c, i) => {
        doc.text(columnLabel(c), startX + i * colWidth + 4, y + 6, { width: colWidth - 8, ellipsis: true });
      });
      return y + rowHeight;
    }

    let y = drawHeader(doc.y);

    doc.font('Helvetica').fontSize(8);
    rows.forEach((row, idx) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ margin: 36, size: 'A4', layout: columns.length > 5 ? 'landscape' : 'portrait' });
        y = drawHeader(doc.page.margins.top);
      }
      if (idx % 2 === 0) {
        doc.rect(startX, y, pageWidth, rowHeight).fill('#f5f5f5');
      }
      doc.fillColor('#222');
      columns.forEach((c, i) => {
        doc.text(String(row[c] ?? ''), startX + i * colWidth + 4, y + 6, { width: colWidth - 8, ellipsis: true });
      });
      y += rowHeight;
    });

    doc.end();
  });
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
    const pdfBuffer = await toPdfBuffer(rows, config.columns, config.label);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${category}-report.pdf"`,
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
