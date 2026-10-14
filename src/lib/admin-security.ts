import 'server-only';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '@/lib/supabase/server';

export type AdminActor = {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
};

export type AdminContext = {
  admin: SupabaseClient;
  actor: AdminActor;
};

export type ContextFailure = {
  ok: false;
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'CONFIGURATION' | 'DATABASE';
  error: string;
};

export type ContextSuccess = { ok: true; context: AdminContext };
export type ContextResult = ContextSuccess | ContextFailure;

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin configuration is missing on the server.');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolve the signed-in user's role from server-side records, never from browser input. */
export async function getActorContext(): Promise<ContextResult> {
  const sessionClient = await createSessionClient();
  const { data: authData, error: authError } = await sessionClient.auth.getUser();

  if (authError || !authData.user) {
    return {
      ok: false,
      code: 'UNAUTHENTICATED',
      error: 'Your session has expired. Sign in again and retry.',
    };
  }

  let admin: SupabaseClient;
  try {
    admin = createServiceRoleClient();
  } catch {
    return {
      ok: false,
      code: 'CONFIGURATION',
      error: 'The server-side Supabase admin configuration is missing.',
    };
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, email, status, role_id')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, code: 'DATABASE', error: 'Unable to verify your JAAD account permissions.' };
  }

  if (!profile || String(profile.status ?? '').toLowerCase() !== 'active' || !profile.role_id) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Your JAAD account is inactive or has no assigned role. Contact an administrator.',
    };
  }

  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id, name')
    .eq('id', profile.role_id)
    .maybeSingle();

  if (roleError || !role?.name) {
    return { ok: false, code: 'DATABASE', error: 'Unable to verify your assigned JAAD role.' };
  }

  return {
    ok: true,
    context: {
      admin,
      actor: {
        id: authData.user.id,
        fullName: String(profile.full_name ?? '').trim() || String(authData.user.user_metadata?.full_name ?? '').trim() || authData.user.email || 'JAAD user',
        email: String(profile.email ?? authData.user.email ?? ''),
        roleId: String(role.id),
        roleName: String(role.name),
      },
    },
  };
}

export async function requireAdminContext(allowedRoles: string[] = ['Super Admin']): Promise<ContextResult> {
  const result = await getActorContext();
  if (!result.ok) return result;

  const allowed = new Set(allowedRoles.map((role) => role.trim().toLowerCase()));
  if (!allowed.has(result.context.actor.roleName.trim().toLowerCase())) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      error: 'You do not have permission to perform this administration action.',
    };
  }

  return result;
}

export type AuditEvent = {
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
};

/** Audit writes happen server-side using the verified actor and never include passwords or tokens. */
export async function writeAuditEvent(context: AdminContext, event: AuditEvent): Promise<string | null> {
  try {
    const { error } = await context.admin.from('audit_log').insert({
      actor_id: context.actor.id,
      actor_name: context.actor.fullName,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      details: event.details ?? {},
    });

    if (error) {
      console.error('[JAAD audit log] Unable to record event:', error.message);
      return 'The change was saved, but its audit entry could not be recorded. Apply the supplied audit-log SQL migration and retry future actions.';
    }

    return null;
  } catch (error) {
    console.error('[JAAD audit log] Unexpected logging error:', error);
    return 'The change was saved, but its audit entry could not be recorded. Apply the supplied audit-log SQL migration and retry future actions.';
  }
}
