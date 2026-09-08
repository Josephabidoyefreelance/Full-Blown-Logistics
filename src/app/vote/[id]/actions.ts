'use server';

import { createClient } from '@/lib/supabase/server';

export async function castPublicVote(employeeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('increment_employee_votes', { employee_id: employeeId });
  if (error) return { error: error.message };
  return { error: null };
}
