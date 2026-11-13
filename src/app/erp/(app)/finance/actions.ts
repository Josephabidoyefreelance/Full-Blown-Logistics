'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const VAT_RATE = 0.075;

function revalidateFinance() {
  revalidatePath('/finance');
  revalidatePath('/dashboard');
}

function validInvoiceStatus(status: string) {
  return ['Paid', 'Pending', 'Overdue'].includes(status);
}

function validExpenseStatus(status: string) {
  return ['Paid', 'Unpaid'].includes(status);
}

function validPOStatus(status: string) {
  return ['Ordered', 'Pending', 'Received'].includes(status);
}

function validQuoteStatus(status: string) {
  return ['Pending', 'Approved', 'Rejected'].includes(status);
}

export async function updateInvoiceStatus(id: string, status: string) {
  if (!id || !validInvoiceStatus(status)) return { error: 'Invalid invoice status.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('invoices').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Invoice was not updated. Check the record and database permissions.' };
  revalidateFinance();
  return { error: null };
}

export async function updateExpenseStatus(id: string, status: string) {
  if (!id || !validExpenseStatus(status)) return { error: 'Invalid expense status.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('expenses').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Expense was not updated. Check the record and database permissions.' };
  revalidateFinance();
  return { error: null };
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  if (!id || !validPOStatus(status)) return { error: 'Invalid purchase order status.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('purchase_orders').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Purchase order was not updated. Check the record and database permissions.' };
  revalidateFinance();
  return { error: null };
}

export async function updateQuotationStatus(id: string, status: string) {
  if (!id || !validQuoteStatus(status)) return { error: 'Invalid quotation status.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('quotations').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Quotation was not updated. Check the record and database permissions.' };
  revalidateFinance();
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

  if (!customer_name || !invoice_date) return { error: 'Customer and date are required.' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Invoice subtotal must be greater than zero.' };
  if (!validInvoiceStatus(status)) return { error: 'Invalid invoice status.' };

  // amount is the pre-VAT subtotal. VAT is always calculated by the system at 7.5%.
  const tax_amount = Math.round(amount * VAT_RATE * 100) / 100;
  const total_amount = Math.round((amount + tax_amount) * 100) / 100;
  const invoice_no = await nextInvoiceNo(supabase);

  const { error } = await supabase.from('invoices').insert({
    invoice_no,
    customer_name,
    amount,
    invoice_date,
    status,
    tax_rate: VAT_RATE * 100,
    tax_amount,
    total_amount,
  });

  if (error) return { error: error.message };
  revalidateFinance();
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

  if (!category || !vendor || !expense_date) return { error: 'Category, vendor, and date are required.' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Expense amount must be greater than zero.' };
  if (!validExpenseStatus(status)) return { error: 'Invalid expense status.' };

  const { error } = await supabase.from('expenses').insert({ category, vendor, amount, expense_date, status });
  if (error) return { error: error.message };
  revalidateFinance();
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

  if (!name || !role_title) return { error: 'Name and role are required.' };
  if (!Number.isFinite(gross_pay) || gross_pay < 0) return { error: 'Gross pay is invalid.' };
  if (!Number.isFinite(deductions) || deductions < 0 || deductions > gross_pay) return { error: 'Deductions are invalid.' };

  const { error } = await supabase.from('employees').insert({ name, role_title, gross_pay, deductions });
  if (error) return { error: error.message };
  revalidateFinance();
  return { error: null };
}

async function nextPurchaseOrderNo(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Do not depend on created_at: older JAAD purchase-order tables may not have it.
  const { data, error } = await supabase.from('purchase_orders').select('po_no');
  if (error) throw new Error(`Could not read purchase-order history: ${error.message}`);

  let maxNum = 100;
  for (const row of data ?? []) {
    const match = String(row.po_no ?? '').match(/(\d+)$/);
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }
  return `PO-${String(maxNum + 1).padStart(4, '0')}`;
}

export async function createPurchaseOrder(formData: FormData) {
  const supabase = await createClient();
  const supplier = String(formData.get('supplier') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const totalRaw = String(formData.get('total') ?? '').trim();
  const total = totalRaw ? Number(totalRaw) : 0;
  const order_date = String(formData.get('order_date') ?? '').trim();
  const status = String(formData.get('status') ?? 'Pending');

  if (!supplier || !order_date) return { error: 'Supplier and date are required.' };
  if (!Number.isFinite(total) || total < 0) return { error: 'Purchase order total is invalid.' };
  if (!validPOStatus(status)) return { error: 'Invalid purchase order status.' };

  let po_no: string;
  try {
    po_no = await nextPurchaseOrderNo(supabase);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not generate purchase-order number.' };
  }

  // Write the current Finance fields and the original JAAD field aliases together.
  // This keeps new records visible to both the current history table and older data.
  const payload = {
    po_no,
    supplier,
    description,
    items_description: description,
    total,
    order_date,
    po_date: order_date,
    status,
  };

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert(payload)
    .select('id, po_no, supplier, total, order_date, status')
    .single();

  if (error) {
    return { error: `Purchase order was not saved: ${error.message}` };
  }

  if (!data?.id) {
    return { error: 'Purchase order was not saved: no record was returned by the database.' };
  }

  revalidateFinance();
  return { error: null, purchaseOrder: data };
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

  if (!customer_name || !quote_date) return { error: 'Customer and date are required.' };
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Quotation amount is invalid.' };
  if (!validQuoteStatus(status)) return { error: 'Invalid quotation status.' };

  const ref = await nextQuotationRef(supabase);
  const { error } = await supabase.from('quotations').insert({ ref, customer_name, route, amount, quote_date, status });
  if (error) return { error: error.message };
  revalidateFinance();
  return { error: null };
}
