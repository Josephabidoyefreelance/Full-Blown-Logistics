import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DriverOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: driver } = await supabase
    .from('drivers')
    .select('id,name,onboarding_expires_at')
    .eq('onboarding_token', token)
    .maybeSingle();

  if (!driver || !driver.onboarding_expires_at || new Date(driver.onboarding_expires_at) < new Date()) {
    return <div className="mx-auto max-w-xl p-8 text-sm text-red-600">This driver onboarding link is invalid or has expired.</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 p-8">
      <h1 className="text-2xl font-bold">JAAD Logistics Driver Onboarding</h1>
      <p className="text-sm text-neutral-500">This secure link is for {driver.name}. The full onboarding form can now be connected to this driver record.</p>
      <div className="rounded-lg border p-4 text-sm">
        Driver record found. Link expires {new Date(driver.onboarding_expires_at).toLocaleString()}.
      </div>
    </div>
  );
}
