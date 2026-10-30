import { redirect } from 'next/navigation';
import { requireAdminContext } from '@/lib/admin-security';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const result = await requireAdminContext(['Super Admin']);
  if (!result.ok) redirect('/customer/dashboard');
  return <>{children}</>;
}
