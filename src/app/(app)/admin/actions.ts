'use server';

import { revalidatePath } from 'next/cache';
import { getActorContext, requireAdminContext, writeAuditEvent } from '@/lib/admin-security';

const VALID_MODULES = new Set([
  'dashboard',
  'crm',
  'customers',
  'shipments',
  'fleet',
  'drivers',
  'warehouse',
  'finance',
  'hr',
  'support',
  'reports',
  'admin',
]);

type ActionResult = { error: string | null; warning?: string | null; message?: string | null };

function auditWarning(message: string | null): ActionResult {
  return { error: null, warning: message };
}

export async function updateRolePermissions(roleId: string, permittedModules: string[]): Promise<ActionResult> {
  const access = await requireAdminContext(['Super Admin']);
  if (!access.ok) return { error: access.error };

  const cleanRoleId = String(roleId ?? '').trim();
  const modules = Array.from(new Set((Array.isArray(permittedModules) ? permittedModules : []).map(String)));
  if (!cleanRoleId) return { error: 'Select a valid role.' };
  if (modules.some((module) => !VALID_MODULES.has(module))) {
    return { error: 'The access list contains an unknown module. Refresh the page and try again.' };
  }

  const { data: role, error: roleLookupError } = await access.context.admin
    .from('roles')
    .select('id, name, permitted_modules')
    .eq('id', cleanRoleId)
    .maybeSingle();

  if (roleLookupError) return { error: 'Unable to load this role before updating access.' };
  if (!role) return { error: 'This role no longer exists. Refresh the page.' };
  if (String(role.name).trim().toLowerCase() === 'super admin' && !modules.includes('admin')) {
    return { error: 'Administration access cannot be removed from the Super Admin role.' };
  }

  const { data: updatedRole, error } = await access.context.admin
    .from('roles')
    .update({ permitted_modules: modules })
    .eq('id', cleanRoleId)
    .select('id, name')
    .maybeSingle();

  if (error) return { error: `Unable to save role access: ${error.message}` };
  if (!updatedRole) return { error: 'No role was updated. Refresh the page and try again.' };

  const warning = await writeAuditEvent(access.context, {
    action: 'Role permissions updated',
    entityType: 'role',
    entityId: cleanRoleId,
    details: {
      summary: `Module access updated for ${updatedRole.name}.`,
      roleName: updatedRole.name,
      permittedModules: modules,
    },
  });

  revalidatePath('/admin');
  return auditWarning(warning);
}

export async function updateUserStatus(profileId: string, status: string): Promise<ActionResult> {
  const access = await requireAdminContext(['Super Admin']);
  if (!access.ok) return { error: access.error };

  const cleanId = String(profileId ?? '').trim();
  if (!cleanId) return { error: 'Select a valid user.' };
  if (status !== 'Active' && status !== 'Suspended') return { error: 'Choose a valid account status.' };
  if (cleanId === access.context.actor.id && status === 'Suspended') {
    return { error: 'You cannot suspend your own account.' };
  }

  const { data: target, error: targetError } = await access.context.admin
    .from('profiles')
    .select('id, full_name, email, status')
    .eq('id', cleanId)
    .maybeSingle();

  if (targetError) return { error: 'Unable to load this user before changing the account status.' };
  if (!target) return { error: 'This user no longer exists. Refresh the page.' };
  if (target.status === status) return { error: null };

  const { error: profileError } = await access.context.admin
    .from('profiles')
    .update({ status })
    .eq('id', cleanId);

  if (profileError) return { error: `Unable to update the account status: ${profileError.message}` };

  const { error: authError } = await access.context.admin.auth.admin.updateUserById(cleanId, {
    ban_duration: status === 'Suspended' ? '876600h' : 'none',
  });

  if (authError) {
    await access.context.admin.from('profiles').update({ status: target.status }).eq('id', cleanId);
    return { error: `The authentication status could not be updated. The profile change was rolled back. ${authError.message}` };
  }

  let secondaryWarning: string | null = null;
  if (status === 'Suspended') {
    const { error: signOutError } = await access.context.admin.auth.admin.signOut(cleanId, 'others');
    if (signOutError) {
      secondaryWarning = 'The account is banned from new sessions, but an existing session could not be explicitly revoked. Check the Supabase Auth logs.';
    }
  }

  const auditWarningMessage = await writeAuditEvent(access.context, {
    action: status === 'Suspended' ? 'User suspended' : 'User reactivated',
    entityType: 'user',
    entityId: cleanId,
    details: {
      summary: `${target.full_name || target.email || 'User'} was set to ${status}.`,
      email: target.email,
      previousStatus: target.status,
      status,
    },
  });

  revalidatePath('/admin');
  return auditWarning(secondaryWarning ?? auditWarningMessage);
}

export async function createUser({
  full_name,
  email,
  password,
  role_name,
}: {
  full_name: string;
  email: string;
  password: string;
  role_name: string;
}): Promise<ActionResult> {
  const access = await requireAdminContext(['Super Admin']);
  if (!access.ok) return { error: access.error };

  const cleanName = String(full_name ?? '').trim();
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const cleanPassword = String(password ?? '');
  const cleanRoleName = String(role_name ?? '').trim();

  if (cleanName.length < 2 || cleanName.length > 120) return { error: 'Enter a name between 2 and 120 characters.' };
  if (!cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { error: 'Enter a valid email address.' };
  }
  if (cleanPassword.length < 8) return { error: 'Use a password with at least 8 characters.' };
  if (!cleanRoleName) return { error: 'Choose a role for this user.' };

  const { data: role, error: roleError } = await access.context.admin
    .from('roles')
    .select('id, name')
    .eq('name', cleanRoleName)
    .maybeSingle();

  if (roleError) return { error: 'Unable to verify the selected role.' };
  if (!role) return { error: 'The selected role does not exist. Refresh the page and choose an available role.' };

  const { data: authData, error: authError } = await access.context.admin.auth.admin.createUser({
    email: cleanEmail,
    password: cleanPassword,
    email_confirm: true,
    user_metadata: { full_name: cleanName },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Supabase did not return the newly created user.' };
  }

  const { error: profileError } = await access.context.admin.from('profiles').upsert({
    id: authData.user.id,
    full_name: cleanName,
    email: cleanEmail,
    status: 'Active',
    role_id: role.id,
  });

  if (profileError) {
    await access.context.admin.auth.admin.deleteUser(authData.user.id);
    return { error: `The profile could not be created, so the new authentication account was removed. ${profileError.message}` };
  }

  const warning = await writeAuditEvent(access.context, {
    action: 'User created',
    entityType: 'user',
    entityId: authData.user.id,
    details: {
      summary: `Created ${cleanName} (${cleanEmail}) with the ${role.name} role.`,
      email: cleanEmail,
      roleName: role.name,
      status: 'Active',
    },
  });

  revalidatePath('/admin');
  return auditWarning(warning);
}

export async function postAnnouncement({
  title,
  body,
  publishAt,
  expiresInHours,
}: {
  title: string;
  body: string;
  /** ISO timestamp supplied by the browser only when scheduling for later. */
  publishAt?: string | null;
  /** null means no automatic expiry; valid durations are intentionally constrained. */
  expiresInHours?: number | null;
}): Promise<ActionResult> {
  const access = await requireAdminContext(['Super Admin']);
  if (!access.ok) return { error: access.error };

  const cleanTitle = String(title ?? '').trim();
  const cleanBody = String(body ?? '').trim();
  if (cleanTitle.length < 3 || cleanTitle.length > 120) return { error: 'The title must be between 3 and 120 characters.' };
  if (cleanBody.length < 3 || cleanBody.length > 5000) return { error: 'The announcement message must be between 3 and 5,000 characters.' };

  const now = new Date();
  const scheduledDate = publishAt ? new Date(publishAt) : now;
  if (Number.isNaN(scheduledDate.getTime())) return { error: 'Choose a valid publication date and time.' };
  if (publishAt && scheduledDate.getTime() < now.getTime() + 60_000) {
    return { error: 'Choose a schedule time at least one minute in the future, or select Publish now.' };
  }
  if (scheduledDate.getTime() > now.getTime() + 366 * 24 * 60 * 60 * 1000) {
    return { error: 'Announcements can be scheduled up to one year ahead.' };
  }

  const allowedDurations = new Set([1, 2, 3, 4, 5, 6, 8, 12, 24, 48, 72]);
  const duration = expiresInHours === undefined ? 5 : expiresInHours;
  if (duration !== null && !allowedDurations.has(Number(duration))) {
    return { error: 'Choose a supported automatic expiry duration.' };
  }

  const publishAtIso = scheduledDate.toISOString();
  const expiresAtIso = duration === null
    ? null
    : new Date(scheduledDate.getTime() + Number(duration) * 60 * 60 * 1000).toISOString();
  const isScheduled = scheduledDate.getTime() > now.getTime();

  const { data: announcement, error } = await access.context.admin
    .from('announcements')
    .insert({
      title: cleanTitle,
      body: cleanBody,
      publish_at: publishAtIso,
      expires_at: expiresAtIso,
    })
    .select('id, title, publish_at, expires_at')
    .maybeSingle();

  if (error) return { error: `The announcement could not be ${isScheduled ? 'scheduled' : 'published'}: ${error.message}` };
  if (!announcement) return { error: 'The announcement was not returned by the database. Refresh and check before trying again.' };

  const scheduledFor = new Date(announcement.publish_at).toLocaleString();
  const warning = await writeAuditEvent(access.context, {
    action: isScheduled ? 'Announcement scheduled' : 'Announcement published',
    entityType: 'announcement',
    entityId: String(announcement.id),
    details: {
      summary: isScheduled
        ? `Scheduled announcement: ${announcement.title} for ${scheduledFor}.`
        : `Published announcement: ${announcement.title}.`,
      title: announcement.title,
      publishAt: publishAtIso,
      expiresAt: expiresAtIso,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { ...auditWarning(warning), message: isScheduled ? 'Announcement scheduled.' : 'Announcement published.' };
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  const access = await requireAdminContext(['Super Admin']);
  if (!access.ok) return { error: access.error };

  const cleanId = String(announcementId ?? '').trim();
  if (!cleanId) return { error: 'Select a valid announcement.' };

  const { data: announcement, error: lookupError } = await access.context.admin
    .from('announcements')
    .select('id, title')
    .eq('id', cleanId)
    .maybeSingle();

  if (lookupError) return { error: `Unable to load the announcement before deleting it: ${lookupError.message}` };
  if (!announcement) return { error: 'This announcement has already been removed. Refresh the page.' };

  const { error: deleteError } = await access.context.admin
    .from('announcements')
    .delete()
    .eq('id', cleanId);

  if (deleteError) return { error: `The announcement could not be deleted: ${deleteError.message}` };

  const warning = await writeAuditEvent(access.context, {
    action: 'Announcement deleted',
    entityType: 'announcement',
    entityId: cleanId,
    details: { summary: `Deleted announcement: ${announcement.title}.`, title: announcement.title },
  });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { ...auditWarning(warning), message: 'Announcement deleted.' };
}

export async function clockIn(userId: string, userName: string): Promise<ActionResult> {
  const access = await getActorContext();
  if (!access.ok) return { error: access.error };

  const targetId = String(userId ?? '').trim() || access.context.actor.id;
  const isAdmin = access.context.actor.roleName.trim().toLowerCase() === 'super admin';
  if (targetId !== access.context.actor.id && !isAdmin) {
    return { error: 'You can only clock in for your own account.' };
  }

  const { data: target, error: targetError } = await access.context.admin
    .from('profiles')
    .select('id, full_name, status')
    .eq('id', targetId)
    .maybeSingle();
  if (targetError || !target) return { error: 'Unable to verify the account for this clock-in.' };
  if (String(target.status).toLowerCase() !== 'active') return { error: 'An inactive account cannot clock in.' };

  const name = String(target.full_name ?? '').trim() || (targetId === access.context.actor.id ? access.context.actor.fullName : String(userName ?? '').trim()) || 'JAAD user';
  const { data: entry, error } = await access.context.admin
    .from('clock_entries')
    .insert({ user_id: targetId, user_name: name })
    .select('id')
    .maybeSingle();
  if (error) return { error: `Unable to clock in: ${error.message}` };

  const warning = await writeAuditEvent(access.context, {
    action: 'Clocked in',
    entityType: 'clock_entry',
    entityId: entry?.id ? String(entry.id) : null,
    details: { summary: `${name} clocked in.`, userId: targetId },
  });
  revalidatePath('/clock-tracker');
  return auditWarning(warning);
}

export async function clockOut(entryId: string, notes?: string): Promise<ActionResult> {
  const access = await getActorContext();
  if (!access.ok) return { error: access.error };

  const cleanEntryId = String(entryId ?? '').trim();
  if (!cleanEntryId) return { error: 'Select a valid clock entry.' };

  const { data: entry, error: entryError } = await access.context.admin
    .from('clock_entries')
    .select('id, user_id, user_name, clock_out')
    .eq('id', cleanEntryId)
    .maybeSingle();
  if (entryError) return { error: 'Unable to load the selected clock entry.' };
  if (!entry) return { error: 'This clock entry no longer exists.' };

  const isAdmin = access.context.actor.roleName.trim().toLowerCase() === 'super admin';
  if (String(entry.user_id) !== access.context.actor.id && !isAdmin) {
    return { error: 'You can only clock out your own account.' };
  }
  if (entry.clock_out) return { error: 'This clock entry is already closed.' };

  const cleanNotes = String(notes ?? '').trim();
  const { data: updatedEntry, error } = await access.context.admin
    .from('clock_entries')
    .update({ clock_out: new Date().toISOString(), notes: cleanNotes || null })
    .eq('id', cleanEntryId)
    .select('id')
    .maybeSingle();
  if (error) return { error: `Unable to clock out: ${error.message}` };
  if (!updatedEntry) return { error: 'The clock entry was not updated. Refresh and try again.' };

  const warning = await writeAuditEvent(access.context, {
    action: 'Clocked out',
    entityType: 'clock_entry',
    entityId: cleanEntryId,
    details: { summary: `${entry.user_name || 'JAAD user'} clocked out.`, userId: entry.user_id },
  });
  revalidatePath('/clock-tracker');
  return auditWarning(warning);
}
