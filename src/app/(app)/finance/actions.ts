'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateInvoiceStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

export async function updateExpenseStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

export async function updateQuotationStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('quotations').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

async function nextInvoiceNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from('invoices').select('invoice_no');
  let maxNum = 400;
  for (const row of data ?? []) {
    const match = String(row.invoice_no ?? '').match(/(\d+)$/);
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }
  return `INV-${String(maxNum + 1).padStart(5, '0')}`;
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();

  const customer_name = String(formData.get('customer_name') ?? '').trim();
  const amountRaw = String(formData.get('amount') ?? '').trim();
  const amount = amountRaw ? Number(amountRaw) : 0;
  const invoice_date = String(formData.get('invoice_date') ?? '').trim();
  const status = String(formData.get('status') ?? 'Pending');

  if (!customer_name || !invoice_date) {
    return { error: 'Customer and date are required.' };
  }

  const invoice_no = await nextInvoiceNo(supabase);

  const { error } = await supabase.from('invoices').insert({
    invoice_no,
    customer_name,
    amount,
    invoice_date,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const category = String(formData.get('category') ?? '').trim();
  const vendor = String(formData.get('vendor') ?? '').trim();
  const amountRaw = String(formData.get('amount') ?? '').trim();
  const amount = amountRaw ? Number(amountRaw) : 0;
  const expense_date = String(formData.get('expense_date') ?? '').trim();
  const status = String(formData.get('status') ?? 'Unpaid');

  if (!category || !vendor || !expense_date) {
    return { error: 'Category, vendor, and date are required.' };
  }

  const { error } = await supabase.from('expenses').insert({
    category,
    vendor,
    amount,
    expense_date,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

export async function createPayrollEntry(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  const role_title = String(formData.get('role_title') ?? '').trim();
  const grossRaw = String(formData.get('gross_pay') ?? '').trim();
  const gross_pay = grossRaw ? Number(grossRaw) : 0;
  const deductionsRaw = String(formData.get('deductions') ?? '').trim();
  const deductions = deductionsRaw ? Number(deductionsRaw) : 0;

  if (!name || !role_title) {
    return { error: 'Name and role are required.' };
  }

  const { error } = await supabase.from('employees').insert({
    name,
    role_title,
    gross_pay,
    deductions,
  });

  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

async function nextPurchaseOrderNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('purchase_orders')
    .select('po_no')
    .order('created_at', { ascending: false })
    .limit(1);

  const last = data?.[0]?.po_no ?? '';
  const match = last.match(/(\d+)$/);
  const nextNum = match ? Number(match[1]) + 1 : 101;
  return `PO-${String(nextNum).padStart(4, '0')}`;
}

export async function createPurchaseOrder(formData: FormData) {
  const supabase = await createClient();

  const supplier = String(formData.get('supplier') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const totalRaw = String(formData.get('total') ?? '').trim();
  const total = totalRaw ? Number(totalRaw) : 0;
  const order_date = String(formData.get('order_date') ?? '').trim();
  const status = String(formData.get('status') ?? 'Pending');

  if (!supplier || !order_date) {
    return { error: 'Supplier and date are required.' };
  }

  const po_no = await nextPurchaseOrderNo(supabase);

  const { error } = await supabase.from('purchase_orders').insert({
    po_no,
    supplier,
    description,
    total,
    order_date,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}

async function nextQuotationRef(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from('quotations').select('ref');
  let maxNum = 1000;
  for (const row of data ?? []) {
    const match = String(row.ref ?? '').match(/(\d+)$/);
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }
  return `QUO-${maxNum + 1}`;
}

export async function createQuotation(formData: FormData) {
  const supabase = await createClient();

  const customer_name = String(formData.get('customer_name') ?? '').trim();
  const route = String(formData.get('route') ?? '').trim() || null;
  const amountRaw = String(formData.get('amount') ?? '').trim();
  const amount = amountRaw ? Number(amountRaw) : 0;
  const quote_date = String(formData.get('quote_date') ?? '').trim();
  const status = String(formData.get('status') ?? 'Pending');

  if (!customer_name || !quote_date) {
    return { error: 'Customer and date are required.' };
  }

  const ref = await nextQuotationRef(supabase);

  const { error } = await supabase.from('quotations').insert({
    ref,
    customer_name,
    route,
    amount,
    quote_date,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath('/finance');
  return { error: null };
}
