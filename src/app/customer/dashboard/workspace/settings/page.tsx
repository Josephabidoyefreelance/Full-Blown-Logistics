import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCustomerTenantContext } from '@/lib/customer-tenant';
import InvoiceBrandingForm from './invoice-branding-form';

export const dynamic = 'force-dynamic';

export default async function InvoiceBrandingSettingsPage() {
  const tenant = await getCustomerTenantContext();
  if (!tenant) redirect('/customer/dashboard?subscription=required');
  const supabase = await createClient();
  const { data: branding } = await supabase.from('invoice_branding').select('legal_name,address,phone,email,website,logo_path').eq('company_id', tenant.companyId).maybeSingle();
  let logoUrl: string | null = null;
  if (branding?.logo_path) {
    const { data } = await supabase.storage.from('jaad-invoice-logos').createSignedUrl(branding.logo_path, 3600);
    logoUrl = data?.signedUrl ?? null;
  }
  return <div className="mx-auto max-w-3xl space-y-5">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Company settings</p><h2 className="mt-2 text-2xl font-bold">Invoice branding</h2><p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">Your invoices use your company name, contact details and logo. JAAD's preinstalled company branding is not used on customer invoices.</p></header>
    <InvoiceBrandingForm companyId={tenant.companyId} initial={{ legal_name: branding?.legal_name ?? tenant.companyName, address: branding?.address ?? '', phone: branding?.phone ?? '', email: branding?.email ?? '', website: branding?.website ?? '', logo_path: branding?.logo_path ?? null }} logoUrl={logoUrl} />
    <p className="text-xs leading-5 text-neutral-500">Logo files are stored in a private bucket under your company ID. Other tenants cannot read your invoice logo through the application or storage policies.</p>
  </div>;
}
