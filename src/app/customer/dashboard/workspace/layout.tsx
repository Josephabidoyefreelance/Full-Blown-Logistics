import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerTenantContext } from "@/lib/customer-tenant";
import { requireSelectedCustomerId } from '@/lib/customer-active-tenant';

export const dynamic = "force-dynamic";

export default async function CustomerWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/customer/login");

  // Shared, authenticated company membership and subscription check.
  // Applies to every existing and future tenant, never a test email.
  const tenant = await getCustomerTenantContext();
  if (!tenant) {
    if (!(await requireSelectedCustomerId())) redirect("/customer/dashboard/select-workspace");
    redirect("/packages?subscription=required");
  }

  // Fail closed until tenant-scoped RLS and module queries are verified.
  if (process.env.CUSTOMER_ERP_TENANT_MODE !== "enabled") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <section className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-white/[0.03] p-7">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">JAAD Logistics</p>
          <h1 className="mt-3 text-2xl font-bold">Customer ERP workspace is being prepared</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            The admin modules have been copied into the customer workspace. Before they can be enabled,
            each module must be scoped to the signed-in business and protected by tenant-level database policies.
            This safety lock prevents one customer from seeing another business&apos;s records.
          </p>
          <Link href="/customer/dashboard" className="mt-6 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm hover:border-red-400">
            ← Back to customer portal
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
