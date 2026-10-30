import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!path.startsWith(`${user.id}/`) || path.includes('..')) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 });
  const admin = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.storage.from('email-attachments').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Attachment is unavailable.' }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
