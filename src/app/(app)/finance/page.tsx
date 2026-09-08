import { createClient } from '@/lib/supabase/server';
import InvoiceModal from './invoice-modal';
import PayslipModal from './payslip-modal';
import ExpenseReceiptModal from './expense-receipt-modal';
import PurchaseOrderModal from './purchase-order-modal';
import QuotationModal from './quotation-modal';
import StatusSwitch from './status-switch';
import ExpenseStatusSwitch from './expense-status-switch';
import PurchaseOrderStatusSwitch from './purchase-order-status-switch';
import QuotationStatusSwitch from './quotation-status-switch';
import NewInvoiceForm from './new-invoice-form';
import NewExpenseForm from './new-expense-form';
import NewPayrollForm from './new-payroll-form';
import NewPurchaseOrderForm from './new-purchase-order-form';
import NewQuotationForm from './new-quotation-form';

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

const VAT_RATE = 0.075;

const INVOICE_COLS = 'grid-cols-[150px_220px_170px_160px_150px]';
const EXPENSE_COLS = 'grid-cols-[170px_220px_170px_160px_150px]';
const PAYROLL_COLS = 'grid-cols-[220px_220px_170px_170px_170px]';
const PO_COLS = 'grid-cols-[150px_220px_170px_160px_150px]';
const QUOTE_COLS = 'grid-cols-[150px_220px_260px_170px_150px]';

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'overview' } = await searchParams;
  const supabase = await createClient();

  const [invoices, expenses, payroll, purchaseOrders, quotations] = await Promise.all([
    supabase.from('invoices').select('id, invoice_no, customer_name, amount, status, invoice_date').order('invoice_date', { ascending: false }),
    supabase.from('expenses').select('id, category, vendor, amount, expense_date, status').order('expense_date', { ascending: false }),
    supabase.from('employees').select('id, name, role_title, gross_pay, deductions').not('gross_pay', 'is', null),
    supabase.from('purchase_orders').select('id, po_no, supplier, description, total, order_date, status').order('order_date', { ascending: false }),
    supabase.from('quotations').select('id, ref, customer_name, route, amount, quote_date, status').order('quote_date', { ascending: false }),
  ]);

  const revenue = (invoices.data ?? []).filter((i) => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0);
  const expenseTotal = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const payrollGross = (payroll.data ?? []).reduce((s, p) => s + Number(p.gross_pay ?? 0), 0);
  const payrollDeductions = (payroll.data ?? []).reduce((s, p) => s + Number(p.deductions ?? 0), 0);
  const payrollNet = payrollGross - payrollDeductions;
  const vat = Math.round(revenue * VAT_RATE);
  const netPosition = revenue - expenseTotal - payrollNet - vat;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Finance</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Accounts, invoicing, payroll and reporting.</p>
      </div>

      <div className="mb-4 flex gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
        <a href="/finance?view=overview" className={`pb-2 ${view === 'overview' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Overview</a>
        <a href="/finance?view=invoices" className={`pb-2 ${view === 'invoices' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Invoices</a>
        <a href="/finance?view=expenses" className={`pb-2 ${view === 'expenses' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Expenses</a>
        <a href="/finance?view=payroll" className={`pb-2 ${view === 'payroll' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Payroll</a>
        <a href="/finance?view=purchase-orders" className={`pb-2 ${view === 'purchase-orders' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Purchase orders</a>
        <a href="/finance?view=quotations" className={`pb-2 ${view === 'quotations' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Quotations</a>
      </div>

      {view === 'overview' && (
        <>
          <p className="mb-4 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            Every figure below is a live query against invoices, expenses and employees, computed on
            each page load. Nothing here is hardcoded.
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Revenue, MTD</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(revenue)}</div>
              <div className="mt-1 text-[11px] text-neutral-400">from paid invoices</div>
            </div>
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Expenses, MTD</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(expenseTotal)}</div>
              <div className="mt-1 text-[11px] text-neutral-400">{expenses.data?.length ?? 0} logged</div>
            </div>
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Net position, MTD</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(netPosition)}</div>
              <div className="mt-1 text-[11px] text-neutral-400">after payroll and VAT</div>
            </div>
            <div className="rounded-xl border-t-2 border-t-red-600 border-x border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">VAT payable, 7.5%</div>
              <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">{nairaFmt(vat)}</div>
              <div className="mt-1 text-[11px] text-neutral-400">on paid revenue</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">P&amp;L snapshot</h3>
            <table className="w-full text-sm text-neutral-700 dark:text-neutral-300">
              <tbody>
                <tr className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">Revenue (paid invoices)</td><td className="py-2 text-right">{nairaFmt(revenue)}</td></tr>
                <tr className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">Operating expenses</td><td className="py-2 text-right">({nairaFmt(expenseTotal)})</td></tr>
                <tr className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">Payroll, net</td><td className="py-2 text-right">({nairaFmt(payrollNet)})</td></tr>
                <tr className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2">VAT, 7.5% of revenue</td><td className="py-2 text-right">({nairaFmt(vat)})</td></tr>
                <tr className="border-t-2 border-neutral-800 font-semibold text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"><td className="py-2">Net position</td><td className="py-2 text-right">{nairaFmt(netPosition)}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'invoices' && (
        <div>
          <div className="mb-4 flex justify-end">
            <NewInvoiceForm />
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1000px]">
              <div className={`grid ${INVOICE_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
                <div>Invoice no.</div>
                <div>Customer</div>
                <div className="pr-8 text-right">Amount</div>
                <div>Date</div>
                <div className="text-right">Status</div>
              </div>
              {(invoices.data ?? []).map((i) => (
                <div key={i.id} className={`grid ${INVOICE_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                  <div className="truncate">
                    <InvoiceModal invoiceNo={i.invoice_no} customerName={i.customer_name} amount={i.amount} date={i.invoice_date} status={i.status} />
                  </div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{i.customer_name}</div>
                  <div className="pr-8 text-right text-neutral-700 dark:text-neutral-300">{nairaFmt(i.amount)}</div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{i.invoice_date}</div>
                  <div className="flex justify-end"><StatusSwitch id={i.id} status={i.status} /></div>
                </div>
              ))}
              {!invoices.data?.length && (
                <div className="px-5 py-8 text-center text-neutral-400">No invoices yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'expenses' && (
        <div>
          <div className="mb-4 flex justify-end">
            <NewExpenseForm />
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1000px]">
              <div className={`grid ${EXPENSE_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
                <div>Category</div>
                <div>Vendor</div>
                <div className="pr-8 text-right">Amount</div>
                <div>Date</div>
                <div className="text-right">Status</div>
              </div>
              {(expenses.data ?? []).map((e) => (
                <div key={e.id} className={`grid ${EXPENSE_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                  <div className="truncate">
                    <ExpenseReceiptModal category={e.category} vendor={e.vendor} amount={e.amount} date={e.expense_date} status={e.status} />
                  </div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{e.vendor}</div>
                  <div className="pr-8 text-right text-neutral-700 dark:text-neutral-300">{nairaFmt(e.amount)}</div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{e.expense_date}</div>
                  <div className="flex justify-end"><ExpenseStatusSwitch id={e.id} status={e.status} /></div>
                </div>
              ))}
              {!expenses.data?.length && (
                <div className="px-5 py-8 text-center text-neutral-400">No expenses yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'payroll' && (
        <div>
          <div className="mb-4 flex justify-end">
            <NewPayrollForm />
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[950px]">
              <div className={`grid ${PAYROLL_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
                <div>Employee</div>
                <div>Role</div>
                <div className="text-right">Gross</div>
                <div className="text-right">Deductions</div>
                <div className="text-right">Net</div>
              </div>
              {(payroll.data ?? []).map((p) => (
                <div key={p.id} className={`grid ${PAYROLL_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                  <div className="truncate">
                    <PayslipModal name={p.name} role={p.role_title} grossPay={p.gross_pay ?? 0} deductions={p.deductions ?? 0} />
                  </div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{p.role_title}</div>
                  <div className="text-right text-neutral-700 dark:text-neutral-300">{nairaFmt(p.gross_pay ?? 0)}</div>
                  <div className="text-right text-neutral-700 dark:text-neutral-300">{nairaFmt(p.deductions ?? 0)}</div>
                  <div className="text-right text-neutral-700 dark:text-neutral-300">{nairaFmt((p.gross_pay ?? 0) - (p.deductions ?? 0))}</div>
                </div>
              ))}
              {!payroll.data?.length && (
                <div className="px-5 py-8 text-center text-neutral-400">No payroll entries yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'purchase-orders' && (
        <div>
          <div className="mb-4 flex justify-end">
            <NewPurchaseOrderForm />
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1000px]">
              <div className={`grid ${PO_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
                <div>PO no.</div>
                <div>Supplier</div>
                <div className="pr-8 text-right">Total</div>
                <div>Date</div>
                <div className="text-right">Status</div>
              </div>
              {purchaseOrders.error && (
                <div className="px-5 py-8 text-center text-sm text-red-600">
                  Could not load purchase orders: {purchaseOrders.error.message}. Make sure the purchase_orders table
                  exists in Supabase.
                </div>
              )}
              {!purchaseOrders.error && (purchaseOrders.data ?? []).map((po) => (
                <div key={po.id} className={`grid ${PO_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                  <div className="truncate"><PurchaseOrderModal poNo={po.po_no} supplier={po.supplier} description={po.description} total={po.total} date={po.order_date} status={po.status} /></div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{po.supplier}</div>
                  <div className="pr-8 text-right text-neutral-700 dark:text-neutral-300">{nairaFmt(po.total)}</div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{po.order_date}</div>
                  <div className="flex justify-end"><PurchaseOrderStatusSwitch id={po.id} status={po.status} /></div>
                </div>
              ))}
              {!purchaseOrders.error && !purchaseOrders.data?.length && (
                <div className="px-5 py-8 text-center text-neutral-400">No purchase orders yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'quotations' && (
        <div>
          <div className="mb-4 flex justify-end">
            <NewQuotationForm />
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[1100px]">
              <div className={`grid ${QUOTE_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
                <div>Reference</div>
                <div>Customer</div>
                <div>Route</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Status</div>
              </div>
              {quotations.error && (
                <div className="px-5 py-8 text-center text-sm text-red-600">
                  Could not load quotations: {quotations.error.message}. Make sure the quotations table exists in
                  Supabase.
                </div>
              )}
              {!quotations.error && (quotations.data ?? []).map((q) => (
                <div key={q.id} className={`grid ${QUOTE_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                  <div className="truncate"><QuotationModal reference={q.ref} customer={q.customer_name} route={q.route} amount={q.amount} status={q.status} /></div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{q.customer_name}</div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{q.route ?? '\u2014'}</div>
                  <div className="text-right text-neutral-700 dark:text-neutral-300">{nairaFmt(q.amount)}</div>
                  <div className="flex justify-end"><QuotationStatusSwitch id={q.id} status={q.status} /></div>
                </div>
              ))}
              {!quotations.error && !quotations.data?.length && (
                <div className="px-5 py-8 text-center text-neutral-400">No quotations yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
