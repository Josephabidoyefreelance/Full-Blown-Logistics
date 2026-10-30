import { redirect } from 'next/navigation';
import { getCustomerTenantContext } from '@/lib/customer-tenant';
export default async function InvoiceSettingsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== 'enabled') redirect('/customer/dashboard?setup=tenant-security');
  if (!(await getCustomerTenantContext())) redirect('/customer/dashboard?subscription=required');
  return <>{children}</>;
}
