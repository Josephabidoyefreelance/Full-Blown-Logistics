import { redirectIfNotCustomerModule } from '@/lib/customer-tenant';

export default async function CustomerModuleLayout({ children }: { children: React.ReactNode }) {
  await redirectIfNotCustomerModule('ai-chat');
  return <>{children}</>;
}
