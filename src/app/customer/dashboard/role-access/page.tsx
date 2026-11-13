import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdministratorTab from '../administrator-tab';

export const dynamic = 'force-dynamic';

export default async function CustomerRoleAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/customer/login');

  // Fail closed: only the authenticated owner of this customer account can edit staff.
  const { data: customer, error } = await supabase.from('customers')
    .select('id, company_name, name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !customer?.id) {
    return <section className="rounded-xl border border-neutral-700 p-5"><h1 className="text-lg font-semibold">Role &amp; Access</h1><p className="mt-2 text-sm">Only the verified company owner can manage employee permissions. If you are the owner, your account must first be linked to the correct company.</p></section>;
  }

  return <section className="space-y-4">
    <div><h1 className="text-xl font-semibold">Role &amp; Access</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage staff access for {customer.company_name || customer.name || 'your company'}.</p></div>
    <AdministratorTab customerId={customer.id} />
  </section>;
}
