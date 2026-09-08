'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function updateRolePermissions(roleId: string, permittedModules: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('roles')
    .update({ permitted_modules: permittedModules })
    .eq('id', roleId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { error: null };
}

export async function updateUserStatus(profileId: string, status: string) {
  const admin = getAdminClient();

  // Update profile status
  const { error: profileError } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', profileId);
  if (profileError) return { error: profileError.message };

  // If suspending, sign out the user and ban them
  if (status === 'Suspended') {
    await admin.auth.admin.updateUser(profileId, { ban_duration: '876600h' });
    await admin.auth.admin.signOut(profileId, 'others');
  } else if (status === 'Active') {
    await admin.auth.admin.updateUser(profileId, { ban_duration: 'none' });
  }

  revalidatePath('/admin');
  return { error: null };
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
}) {
  const admin = getAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (authError) return { error: authError.message };

  const { data: role } = await admin.from('roles').select('id').eq('name', role_name).single();

  const { error: profileError } = await admin.from('profiles').upsert({
    id: authData.user.id,
    full_name,
    email,
    status: 'Active',
    role_id: role?.id ?? null,
  });
  if (profileError) return { error: profileError.message };

  revalidatePath('/admin');
  return { error: null };
}

export async function postAnnouncement({ title, body }: { title: string; body: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').insert({ title, body });
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function clockIn(userId: string, userName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('clock_entries').insert({
    user_id: userId,
    user_name: userName,
  });
  if (error) return { error: error.message };
  revalidatePath('/clock-tracker');
  return { error: null };
}

export async function clockOut(entryId: string, notes?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('clock_entries')
    .update({ clock_out: new Date().toISOString(), notes: notes ?? null })
    .eq('id', entryId);
  if (error) return { error: error.message };
  revalidatePath('/clock-tracker');
  return { error: null };
}
