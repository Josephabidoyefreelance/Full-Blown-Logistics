import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { redirectIfNotCustomerModule } from '@/lib/customer-tenant';
import { addCustomerLead, changeCustomerLeadStatus } from './actions';
export const dynamic = 'force-dynamic';
const statuses = ['New','Contacted','Qualified','Won','Lost'];
export default async function CustomerTenantCRM() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect('/customer/login');
 const { customerId: tenantId } = await redirectIfNotCustomerModule('crm');
 const { data: leads, error } = await supabase.from('customer_erp_leads').select('id,company,contact_name,email,phone,status,created_at').eq('tenant_customer_id',tenantId).order('created_at',{ascending:false});
 if (error) return <main className="p-8 text-red-500">CRM could not load: {error.message}</main>;
 return <main className="p-6 text-neutral-900 dark:text-neutral-100">
  <h1 className="text-2xl font-bold">CRM & Leads</h1><p className="mt-1 text-sm text-neutral-500">Private leads for your company. Total: {leads?.length ?? 0}</p>
  <form action={addCustomerLead} className="mt-6 grid gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700 sm:grid-cols-2">
   <input name="company" placeholder="Company" maxLength={200} className="rounded border p-2 text-black"/>
   <input name="contact_name" placeholder="Contact name" maxLength={200} className="rounded border p-2 text-black"/>
   <input name="email" type="email" placeholder="Email" maxLength={200} className="rounded border p-2 text-black"/>
   <input name="phone" placeholder="Phone" maxLength={80} className="rounded border p-2 text-black"/>
   <button type="submit" className="rounded bg-red-600 px-4 py-2 font-semibold text-white sm:col-span-2">Add lead</button>
  </form>
  <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Status</th></tr></thead><tbody>{(leads??[]).map(lead=><tr key={lead.id} className="border-b border-neutral-200 dark:border-neutral-700"><td className="p-3">{lead.company}</td><td className="p-3">{lead.contact_name}</td><td className="p-3">{lead.email}</td><td className="p-3">{lead.phone}</td><td className="p-3"><form action={changeCustomerLeadStatus} className="flex gap-2"><input type="hidden" name="id" value={lead.id}/><select name="status" defaultValue={lead.status} className="rounded border p-1 text-black">{statuses.map(s=><option key={s}>{s}</option>)}</select><button type="submit" className="rounded bg-red-600 px-2 py-1 text-white">Save</button></form></td></tr>)}</tbody></table>{!leads?.length&&<p className="p-4 text-neutral-500">No leads yet. Add your first lead above.</p>}</div>
 </main>;
}
