'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function voteEmployeePublic(id: string) {
  if (!id) redirect('/');
  const supabase = await createClient();
  const { data: employee, error: readError } = await supabase
    .from('employees')
    .select('votes')
    .eq('id', id)
    .maybeSingle();
  if (readError || !employee) redirect(`/employee-of-the-year/${encodeURIComponent(id)}?vote=unavailable`);

  const { error } = await supabase
    .from('employees')
    .update({ votes: Number(employee.votes ?? 0) + 1 })
    .eq('id', id);
  if (error) redirect(`/employee-of-the-year/${encodeURIComponent(id)}?vote=failed`);

  revalidatePath('/hr');
  revalidatePath(`/employee-of-the-year/${id}`);
  redirect(`/employee-of-the-year/${encodeURIComponent(id)}?vote=recorded`);
}
