import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCustomerWorkspaceSelection, CUSTOMER_TENANT_COOKIE } from '@/lib/customer-active-tenant';

export const dynamic = 'force-dynamic';

async function selectWorkspace(form: FormData) {
  'use server';
  const selection = await getCustomerWorkspaceSelection();
  if (!selection) redirect('/customer/login');
  const selected = String(form.get('customer_id') ?? '');
  if (!selection.tenantIds.includes(selected)) throw new Error('Workspace access denied.');
  (await cookies()).set(CUSTOMER_TENANT_COOKIE, selected, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30
  });
  const next = String(form.get('next') ?? '');
  redirect(next.startsWith('/customer/dashboard/') &&
    !next.startsWith('/customer/dashboard/select-workspace') && !next.startsWith('//')
    ? next : '/customer/dashboard');
}

export default async function SelectCustomerWorkspace({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  const selection = await getCustomerWorkspaceSelection();
  if (!selection) redirect('/customer/login');
  const { data: customers } = selection.tenantIds.length
    ? await selection.supabase.from('customers')
      .select('id, name, company_name').in('id', selection.tenantIds)
    : { data: [] as { id: string; name: string; company_name: string | null }[] };
  const next = (await searchParams).next ?? '/customer/dashboard';
  return <main className="mx-auto max-w-2xl space-y-5 p-8">
    <h1 className="text-2xl font-bold">Select customer workspace</h1>
    <p className="text-sm text-neutral-500">Only workspaces where you are an active owner or accepted staff member are shown.</p>
    {(customers ?? []).length ? <div className="grid gap-3">{(customers ?? []).map(c =>
      <form key={c.id} action={selectWorkspace} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <input type="hidden" name="customer_id" value={c.id} />
        <input type="hidden" name="next" value={next} />
        <div className="flex items-center justify-between gap-4">
          <span className="truncate font-semibold">{c.company_name || c.name}</span>
          <button type="submit" className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white">Open</button>
        </div>
      </form>
    )}</div> : <p>No accepted, active customer workspaces are linked to this account.</p>}
    <Link href="/customer/dashboard" className="text-sm text-red-500 underline">Back to dashboard</Link>
  </main>;
}
