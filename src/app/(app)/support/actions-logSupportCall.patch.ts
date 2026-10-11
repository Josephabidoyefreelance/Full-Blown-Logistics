// In app/support/actions.ts, update only logSupportCall to accept a status.
// Replace the existing logSupportCall function with this version.
export async function logSupportCall(formData: FormData, status = 'Logged (no voice provider connected)') {
  const supabase = await createClient();
  const number = String(formData.get('number') ?? '').trim();
  if (!number) return { error: 'Number is required.' };

  const { error } = await supabase.from('support_calls').insert({
    number,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}
