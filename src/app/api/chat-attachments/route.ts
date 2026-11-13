import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
const BUCKET = 'chat-attachments';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf',
};

async function authorize(chatId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(chatId)) return null;
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: companyId, error: companyError } = await db.rpc('jaad_current_company_id');
  if (companyError || typeof companyId !== 'string') return null;
  const { data: permitted, error: moduleError } = await db.rpc('auth_has_module', { module_key: 'support' });
  if (moduleError || permitted !== true) return null;
  const { data: chat, error: chatError } = await db.from('live_chats')
    .select('id').eq('id', chatId).eq('company_id', companyId).maybeSingle();
  if (chatError || !chat) return null;
  return { db, companyId };
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const chatId = form?.get('chatId');
  const file = form?.get('file');
  if (typeof chatId !== 'string' || !(file instanceof File))
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (!TYPES[file.type] || file.size < 1 || file.size > MAX_BYTES)
    return NextResponse.json({ error: 'Only PNG, JPEG, WebP and PDF files up to 5 MB are allowed' }, { status: 400 });
  const access = await authorize(chatId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const path = `${access.companyId}/${chatId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error } = await access.db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) return NextResponse.json({ error: 'Storage upload denied' }, { status: 403 });
  const url = `/api/chat-attachments?path=${encodeURIComponent(path)}`;
  return NextResponse.json({ url, path });
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '';
  const segments = path.split('/');
  if (segments.length !== 3 || !/^[0-9a-f-]{36}$/i.test(segments[0]) ||
      !/^[0-9a-f-]{36}$/i.test(segments[1]) || !/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/i.test(segments[2]))
    return new NextResponse('Not found', { status: 404 });
  const access = await authorize(segments[1]);
  if (!access || segments[0] !== access.companyId)
    return new NextResponse('Not found', { status: 404 });
  const { data, error } = await access.db.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(data.signedUrl, 302);
}
