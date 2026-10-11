// Merge these Team Chat-only changes into app/support/actions.ts.
// Keep every unrelated action in that file unchanged.

export async function sendTeamChatMessage(
  senderName: string,
  message: string,
  recipientName: string | null = null,
) {
  if (!message.trim()) return { error: 'Message is empty.' };
  const supabase = await createClient();
  const { error } = await supabase.from('team_chat_messages').insert({
    sender_name: senderName,
    message: message.trim(),
    recipient_name: recipientName,
  });
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function uploadTeamChatFile(
  senderName: string,
  formData: FormData,
  recipientName: string | null = null,
) {
  const supabase = await createClient();
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file selected.' };

  const safeName = file.name.replace(/[\\/]/g, '_');
  const path = `teamchat/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from('chat-attachments').getPublicUrl(path);
  const { error } = await supabase.from('team_chat_messages').insert({
    sender_name: senderName,
    recipient_name: recipientName,
    message: `📎 ${safeName}|${pub.publicUrl}`,
  });
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}

export async function markTeamChatRead(currentUserName: string, senderName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('team_chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_name', currentUserName)
    .eq('sender_name', senderName)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/support');
  return { error: null };
}
