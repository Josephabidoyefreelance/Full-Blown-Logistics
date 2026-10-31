import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !publicKey || !serviceKey) {
      console.error('JAAD session-check: required Supabase server configuration is missing');
      return reply('Administrator verification is not configured on the server.', 503);
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || !('accessToken' in body)) {
      return reply('Missing authentication token.', 400);
    }
    const accessToken = (body as { accessToken?: unknown }).accessToken;
    if (typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 8192) {
      return reply('Invalid authentication token.', 400);
    }

    // Verify the JWT with Supabase Auth, never by decoding it without validation.
    const authClient = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !authData.user) return reply('Your session is invalid or expired. Please sign in again.', 401);

    // Server-only elevated client: the browser never receives the service key.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, status, role_id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) {
      console.error('JAAD session-check: profile lookup failed', profileError.message);
      return reply('Unable to read administrator permissions.', 500);
    }
    if (!profile || profile.status !== 'Active' || !profile.role_id) {
      return reply('This account does not have active JAAD Super Admin access.', 403);
    }

    const { data: role, error: roleError } = await admin
      .from('roles')
      .select('name')
      .eq('id', profile.role_id)
      .maybeSingle();
    if (roleError) {
      console.error('JAAD session-check: role lookup failed', roleError.message);
      return reply('Unable to read administrator role.', 500);
    }
    if (role?.name?.trim().toLowerCase() !== 'super admin') {
      return reply('This account does not have active JAAD Super Admin access.', 403);
    }

    return NextResponse.json({ authorized: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('JAAD session-check: unexpected failure', error);
    return reply('Administrator verification failed on the server.', 500);
  }
}
