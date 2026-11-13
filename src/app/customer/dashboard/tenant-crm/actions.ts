'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireCustomerModule } from '@/lib/customer-tenant';

async function context() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new Error('Please sign in.');
 const access = await requireCustomerModule('crm');
 if (!access.ok) throw new Error('Your workspace, role or subscription does not permit CRM access.');
 const tenantId = access.context.customerId;
 return { supabase, user, tenantId };
}
export async function addCustomerLead(form: FormData) {
 const { supabase, user, tenantId } = await context();
 const company = String(form.get('company') || '').trim().slice(0, 200);
 const contact_name = String(form.get('contact_name') || '').trim().slice(0, 200);
 const email = String(form.get('email') || '').trim().slice(0, 200);
 const phone = String(form.get('phone') || '').trim().slice(0, 80);
 if (!company && !contact_name) throw new Error('Enter a company or contact name.');
 const { error } = await supabase.from('customer_erp_leads').insert({tenant_customer_id:tenantId,company,contact_name,email,phone,created_by:user.id});
 if (error) throw new Error(error.message);
 revalidatePath('/customer/dashboard/tenant-crm');
}
export async function changeCustomerLeadStatus(form: FormData) {
 const { supabase, tenantId } = await context();
 const id = String(form.get('id') || '');
 const status = String(form.get('status') || '');
 if (!/^[0-9a-f-]{36}$/i.test(id) || !['New','Contacted','Qualified','Won','Lost'].includes(status)) throw new Error('Invalid lead or status.');
 const { error } = await supabase.from('customer_erp_leads').update({status,updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_customer_id',tenantId);
 if (error) throw new Error(error.message);
 revalidatePath('/customer/dashboard/tenant-crm');
}
