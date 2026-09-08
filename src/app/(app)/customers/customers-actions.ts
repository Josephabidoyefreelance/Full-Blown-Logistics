'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateCustomerStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('customers').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/customers');
  return { error: null };
}

export async function updateCustomerAssignedTo(id: string, assignedTo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from('customers').update({ assigned_to: assignedTo }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/customers');
  return { error: null };
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();

  const assignedTo = String(formData.get('assigned_to') || '');

  const { error } = await supabase.from('customers').insert({
    name: String(formData.get('name')),
    type: String(formData.get('type') || 'B2B'),
    contact: String(formData.get('contact') || ''),
    credit_limit: Number(formData.get('credit_limit') || 0),
    balance: Number(formData.get('balance') || 0),
    status: String(formData.get('status') || 'Active'),
    client_since: String(formData.get('client_since') || new Date().getFullYear()),
    assigned_to: assignedTo || null,
    currency: String(formData.get('currency') || 'NGN'),
    tax_rate: Number(formData.get('tax_rate') || 7.5),
  });

  if (error) return { error: error.message };
  revalidatePath('/customers');
  return { error: null };
}

export async function updateCustomerDetails(id: string, formData: FormData) {
  const supabase = await createClient();

  const assignedTo = String(formData.get('assigned_to') || '');

  const { error } = await supabase
    .from('customers')
    .update({
      name: String(formData.get('name')),
      type: String(formData.get('type') || 'B2B'),
      contact: String(formData.get('contact') || ''),
      credit_limit: Number(formData.get('credit_limit') || 0),
      balance: Number(formData.get('balance') || 0),
      client_since: String(formData.get('client_since') || ''),
      assigned_to: assignedTo || null,
      currency: String(formData.get('currency') || 'NGN'),
      tax_rate: Number(formData.get('tax_rate') || 7.5),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/customers');
  return { error: null };
}

export async function importCustomersFromLeads() {
  const supabase = await createClient();

  const { data: wonLeads, error: leadsError } = await supabase
    .from('leads')
    .select('company, contact_name, phone, value, assigned_to')
    .eq('status', 'Won');

  if (leadsError) return { error: leadsError.message, imported: 0, skipped: 0 };
  if (!wonLeads?.length) return { error: null, imported: 0, skipped: 0 };

  const { data: existing } = await supabase.from('customers').select('name');
  const existingNames = new Set((existing ?? []).map((c) => (c.name || '').toLowerCase()));

  const toInsert = wonLeads
    .filter((l) => !existingNames.has((l.company || '').toLowerCase()))
    .map((l) => ({
      name: l.company,
      type: 'B2B',
      contact: [l.contact_name, l.phone].filter(Boolean).join(', '),
      credit_limit: Number(l.value) || 0,
      balance: 0,
      status: 'Active',
      client_since: String(new Date().getFullYear()),
      assigned_to: l.assigned_to ?? null,
    }));

  const skipped = wonLeads.length - toInsert.length;

  if (!toInsert.length) return { error: null, imported: 0, skipped };

  const { error } = await supabase.from('customers').insert(toInsert);
  if (error) return { error: error.message, imported: 0, skipped };

  revalidatePath('/customers');
  return { error: null, imported: toInsert.length, skipped };
}
