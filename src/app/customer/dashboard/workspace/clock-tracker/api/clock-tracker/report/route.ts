import { createClient } from '@/lib/supabase/server';
import { requireCustomerModule } from '@/lib/customer-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pdfEscape(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function makePdf(lines: string[]) {
  const pageLines = [];
  for (let i = 0; i < lines.length; i += 45) pageLines.push(lines.slice(i, i + 45));
  if (!pageLines.length) pageLines.push(['No time sessions found.']);

  const objects: string[] = [];
  const pageIds: number[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  // Pages object is populated after page objects are assigned.
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pageLines.forEach((page, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const commands = [
      'BT',
      '/F1 10 Tf',
      '48 794 Td',
      '14 TL',
      ...page.map((line, lineIndex) => `${lineIndex === 0 ? '' : 'T* ' }(${pdfEscape(line)}) Tj`),
      'ET',
    ].join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\nstream\n${commands}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, 'binary');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

export async function GET() {
  const access = await requireCustomerModule('clock-tracker');
  if (!access.ok) return new Response('Workspace access denied.', { status: 403 });
  const companyId = access.context.companyId;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response('Please sign in to download your time report.', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).maybeSingle();

  const { data: entries, error } = await supabase
    .from('clock_entries')
    .select('clock_in, clock_out, duration_minutes, notes, user_name')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .order('clock_in', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Time report export failed:', error);
    return new Response('Could not create the time report.', { status: 500 });
  }

  const name = profile?.full_name || user.email || 'Staff member';
  const lines = [
    'JAAD ERP - STAFF TIME REPORT',
    `Staff: ${name}`,
    `Generated: ${new Date().toLocaleString('en-GB')}`,
    `Records: ${(entries ?? []).length}`,
    '',
    'DATE | CLOCK IN | CLOCK OUT | DURATION | NOTES',
    '------------------------------------------------------------',
  ];

  for (const entry of entries ?? []) {
    const date = new Date(entry.clock_in).toLocaleDateString('en-GB');
    const clockIn = new Date(entry.clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const clockOut = entry.clock_out
      ? new Date(entry.clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : 'ACTIVE';
    const minutes = entry.duration_minutes == null ? 'In progress' : `${Math.floor(Number(entry.duration_minutes) / 60)}h ${Number(entry.duration_minutes) % 60}m`;
    const note = (entry.notes || '-').replace(/\s+/g, ' ').slice(0, 55);
    lines.push(`${date} | ${clockIn} | ${clockOut} | ${minutes} | ${note}`);
  }

  const pdf = makePdf(lines);
  const filename = `JAAD-Time-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
