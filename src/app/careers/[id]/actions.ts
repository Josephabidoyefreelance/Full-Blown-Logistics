'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitApplication(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const role_applied_for = String(formData.get('role_applied_for') ?? '').trim();

  if (!name || !email || !role_applied_for) {
    return { error: 'Name, email, and role are required.' };
  }

  const { error } = await supabase.from('applicants').insert({
    name,
    email,
    phone: phone || null,
    message: message || null,
    role_applied_for,
    stage: 'Screening',
  });

  if (error) return { error: error.message };
  return { error: null };
}
