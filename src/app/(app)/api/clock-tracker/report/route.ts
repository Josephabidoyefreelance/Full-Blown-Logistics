import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TZ = 'Africa/Lagos';
const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const WORKDAY_SECONDS = 8 * 60 * 60;
const WORKWEEK_SECONDS = 40 * 60 * 60;

function dayKey(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
function weekKey(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const y = Number(parts.find(p => p.type === 'year')?.value);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const d = Number(parts.find(p => p.type === 'day')?.value);
  const monday = new Date(Date.UTC(y, m - 1, d));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}
function durationLabel(seconds: number) {
  const mins = Math.max(0, Math.floor(seconds / 60));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function dateLabel(value: string) { return dateFmt.format(new Date(value)); }
function timeLabel(value: string | null) { return value ? timeFmt.format(new Date(value)) : '—'; }
function ascii(value: unknown, max = 32) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function pdfEscape(value: string) { return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
function textCommand(x: number, y: number, value: string, size = 8, bold = false) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${pdfEscape(ascii(value, 90))}) Tj ET\n`;
}
function makePdf(pages: string[][]) {
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const fontRegularId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds: number[] = [];
  for (const lines of pages) {
    let content = '';
    content += textCommand(30, 562, 'JAAD ERP - Clock Tracker Time Report', 15, true);
    content += textCommand(30, 545, `Generated: ${dateFmt.format(new Date())} ${timeFmt.format(new Date())} (Africa/Lagos)`, 8, false);
    const columns = [30, 132, 198, 252, 306, 365, 440, 515, 600];
    const headers = ['STAFF', 'DATE', 'CLOCK IN', 'CLOCK OUT', 'DURATION', 'WEEKLY TIME', 'OVERTIME', 'IDLE TIME', 'NOTES'];
    headers.forEach((h, i) => { content += textCommand(columns[i], 522, h, 7, true); });
    content += '0.75 w 30 514 m 812 514 l S\n';
    let y = 498;
    for (const line of lines) {
      const cells = line;
      cells.forEach((cell, i) => { content += textCommand(columns[i], y, cell, 7, false); });
      content += '0.35 w 30 ' + (y - 5) + ' m 810 ' + (y - 5) + ' l S\n';
      y -= 14;
    }
    const stream = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`;
    const contentId = add(stream);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let pdf = '%PDF-1.4\n%JAAD\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Please sign in to download your report.' }, { status: 401 });

    const [{ data: profile, error: profileError }, { data: entries, error: entriesError }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      supabase.from('clock_entries')
        .select('id, user_name, clock_in, clock_out, notes, paused_at, paused_seconds, idle_seconds')
        .eq('user_id', user.id).order('clock_in', { ascending: true }).limit(5000),
    ]);
    if (profileError) throw profileError;
    if (entriesError) throw entriesError;

    const regularByDay = new Map<string, number>();
    const regularByWeek = new Map<string, number>();
    const actualByWeek = new Map<string, number>();
    const rows: string[][] = [];
    for (const entry of entries ?? []) {
      const endMs = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now();
      const pausedMs = Math.max(0, Number(entry.paused_seconds || 0) * 1000 + (entry.paused_at ? endMs - new Date(entry.paused_at).getTime() : 0));
      const elapsedSeconds = Math.max(0, Math.floor((endMs - new Date(entry.clock_in).getTime() - pausedMs) / 1000));
      const dKey = dayKey(entry.clock_in);
      const wKey = weekKey(entry.clock_in);
      const usedDay = regularByDay.get(dKey) ?? 0;
      const usedWeek = regularByWeek.get(wKey) ?? 0;
      const actualWeekBefore = actualByWeek.get(wKey) ?? 0;
      const regularSeconds = Math.min(elapsedSeconds, Math.max(0, WORKDAY_SECONDS - usedDay), Math.max(0, WORKWEEK_SECONDS - usedWeek));
      const overtimeSeconds = Math.max(0, elapsedSeconds - regularSeconds);
      regularByDay.set(dKey, usedDay + regularSeconds);
      regularByWeek.set(wKey, usedWeek + regularSeconds);
      actualByWeek.set(wKey, actualWeekBefore + elapsedSeconds);
      rows.push([
        ascii(entry.user_name || profile?.full_name || user.email || 'Staff member', 20),
        dateLabel(entry.clock_in), timeLabel(entry.clock_in), timeLabel(entry.clock_out),
        durationLabel(elapsedSeconds), durationLabel(actualWeekBefore + elapsedSeconds), durationLabel(overtimeSeconds),
        durationLabel(Number(entry.idle_seconds || 0)), ascii(entry.notes || '—', 28),
      ]);
    }
    if (!rows.length) rows.push(['No time records yet', '', '', '', '', '', '', '', '']);
    const chunks: string[][] = [];
    for (let i = 0; i < rows.length; i += 34) chunks.push(rows.slice(i, i + 34));
    const pdf = makePdf(chunks.length ? chunks : [[]]);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="JAAD-Clock-Tracker-Report.pdf"',
        'Content-Length': String(pdf.byteLength),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Clock tracker PDF report failed:', error);
    return Response.json({ error: 'Could not generate the clock tracker PDF. Check the server log and confirm the clock_entries pause columns exist.' }, { status: 500 });
  }
}
