'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createLead(formData: FormData) {
  const supabase = await createClient();
  const value = Number(formData.get('value') || 0);

  const { error } = await supabase.from('leads').insert({
    company: String(formData.get('company')),
    contact_name: String(formData.get('contact_name')),
    job_title: String(formData.get('job_title') || ''),
    email: String(formData.get('email') || ''),
    phone: String(formData.get('phone')),
    source: String(formData.get('source') || 'Website'),
    priority: String(formData.get('priority') || 'Warm'),
    status: 'New',
    transport_mode: String(formData.get('transport_mode') || ''),
    origin: String(formData.get('origin') || ''),
    destination: String(formData.get('destination') || ''),
    value,
  });

  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('leads').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function updateLeadPriority(id: string, priority: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('leads').update({ priority }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function updateLeadAssignedTo(id: string, assignedTo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from('leads').update({ assigned_to: assignedTo }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function updateLeadDetails(id: string, formData: FormData) {
  const supabase = await createClient();
  const value = Number(formData.get('value') || 0);

  const { error } = await supabase
    .from('leads')
    .update({
      company: String(formData.get('company')),
      contact_name: String(formData.get('contact_name')),
      job_title: String(formData.get('job_title') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      transport_mode: String(formData.get('transport_mode') || ''),
      origin: String(formData.get('origin') || ''),
      destination: String(formData.get('destination') || ''),
      value,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function addLeadNote(leadId: string, note: string, authorName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: leadId, note, author_name: authorName });
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

export async function getLeadNotes(leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lead_notes')
    .select('id, note, author_name, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message, notes: [] };
  return { error: null, notes: data ?? [] };
}

export async function updateLeadCallbackDate(id: string, callbackDate: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('leads')
    .update({ callback_date: callbackDate || null })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/crm');
  return { error: null };
}

type ImportRow = {
  company?: string;
  contact_name?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  source?: string;
  priority?: string;
  transport_mode?: string;
  origin?: string;
  destination?: string;
  value?: number | string;
};

const VALID_SOURCES = ['Website', 'Referral', 'Cold Call', 'Social Media', 'Trade Show', 'Other'];
const VALID_PRIORITIES = ['Hot', 'Warm', 'Cold'];

export async function importLeads(rows: ImportRow[]) {
  const supabase = await createClient();

  const toInsert: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const row of rows) {
    const company = String(row.company || '').trim();
    const contact_name = String(row.contact_name || '').trim();
    const phone = String(row.phone || '').trim();

    if (!company || !contact_name || !phone) {
      skipped++;
      continue;
    }

    toInsert.push({
      company,
      contact_name,
      job_title: String(row.job_title || ''),
      email: String(row.email || ''),
      phone,
      source: VALID_SOURCES.includes(String(row.source)) ? row.source : 'Other',
      priority: VALID_PRIORITIES.includes(String(row.priority)) ? row.priority : 'Warm',
      status: 'New',
      transport_mode: String(row.transport_mode || ''),
      origin: String(row.origin || ''),
      destination: String(row.destination || ''),
      value: Number(row.value) || 0,
    });
  }

  if (!toInsert.length) {
    return { error: null, imported: 0, skipped };
  }

  const { error } = await supabase.from('leads').insert(toInsert);
  if (error) return { error: error.message, imported: 0, skipped };

  revalidatePath('/crm');
  return { error: null, imported: toInsert.length, skipped };
}

export async function convertLeadToCustomer(id: string) {
  if (!id) return { error: 'Missing lead id.' };
  const supabase = await createClient();

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('id, company, contact_name, email, phone, assigned_to, value')
    .eq('id', id)
    .single();

  if (fetchError || !lead) {
    return { error: fetchError?.message ?? 'Could not find that lead.' };
  }

  const { error: insertError } = await supabase.from('customers').insert({
    name: lead.company || lead.contact_name,
    type: 'B2B',
    contact: lead.phone || lead.email || '',
    credit_limit: 0,
    balance: 0,
    status: 'Active',
    client_since: new Date().getFullYear(),
    assigned_to: lead.assigned_to,
    currency: 'NGN',
    tax_rate: 7.5,
  });

  if (insertError) return { error: insertError.message };

  const { error: deleteError } = await supabase.from('leads').delete().eq('id', id);
  if (deleteError) return { error: deleteError.message };

  revalidatePath('/crm');
  revalidatePath('/customers');
  return { error: null };
}
