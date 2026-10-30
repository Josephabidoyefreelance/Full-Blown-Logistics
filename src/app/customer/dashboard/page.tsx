import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CustomerPortalPage from './portal-page';

export const dynamic = 'force-dynamic';

// Keep the existing shipment-customer portal intact. Users provisioned as subscribed ERP companies
// are routed to the real workspace instead of the old button-only module directory.
export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
    if (profile?.company_id) redirect('/customer/dashboard/workspace');
  }
  return <CustomerPortalPage />;
}
