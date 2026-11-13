import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function acceptCustomerInvitation(form: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/customer/login');
  const customerId = String(form.get('customer_id') ?? '');
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(customerId)) {
    throw new Error('Invalid invitation');
  }
  const { data: accepted, error } = await supabase.rpc('jaad_accept_my_customer_invite', {
    p_customer_id: customerId,
  });
  if (error || !accepted) throw new Error('Invitation is no longer valid or your verified email does not match.');
  redirect('/customer/dashboard/select-workspace');
}

export default async function CustomerInvitationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/customer/login');
  const { data: invitations, error } = await supabase.rpc('jaad_my_pending_customer_invites');
  if (error) throw new Error('Could not verify pending invitations.');
  if (!invitations?.length) redirect('/customer/dashboard/select-workspace');

  return <main className="mx-auto max-w-xl space-y-5 p-8">
    <h1 className="text-2xl font-bold">Customer workspace invitation</h1>
    <p className="text-sm text-neutral-500">Select the company whose staff invitation you want to accept.</p>
    <div className="space-y-3">{invitations.map((invite: { customer_id: string; company_name: string }) =>
      <form key={invite.customer_id} action={acceptCustomerInvitation} className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <input type="hidden" name="customer_id" value={invite.customer_id}/>
        <span className="truncate font-medium">{invite.company_name}</span>
        <button type="submit" className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white">Accept invitation</button>
      </form>)}</div>
  </main>;
}
