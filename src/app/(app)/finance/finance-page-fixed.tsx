import { createClient } from '@/lib/supabase/server';
import FinanceLiveRefresh from './live-refresh';
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function nairaFmt(n: number) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

const VAT_RATE = 0.075;

function dateAge(date: string) {
  const then = new Date(date).getTime();
  if (!Number.isFinite(then)) return '—';
  const days = Math.max(0, Math.floor((Date.now() - then) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function statusBadge(status: string) {
  const tone =
    status === 'Paid' || status === 'Received' || status === 'Approved'
      ? 'bg-green-50 text-green-700 ring-green-200'
      : status === 'Overdue' || status === 'Rejected'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return `inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function TableShell({ children, minWidth = '1050px' }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

const th = 'px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const td = 'border-t border-neutral-100 px-2.5 py-2 text-[12px] text-neutral-700 dark:border-neutral-800 dark:text-neutral-300';
const wideTh = 'px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
const wideTd = 'border-t border-neutral-100 px-4 py-3 text-[12px] text-neutral-700 dark:border-neutral-800 dark:text-neutral-300';

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; open?: string }>;
}) {
  const { view = 'overview', open: openInvoiceId } = await searchParams;
  const supabase = await createClient();

  const [invoices, expenses, payroll, purchaseOrders, quotations] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_no, customer_name, amount, status, invoice_date')
      .order('invoice_date', { ascending: false }),
    supabase
      .from('expenses')
      .select('id, category, vendor, amount, expense_date, status')
      .order('expense_date', { ascending: false }),
    supabase
      .from('employees')
      .select('id, name, role_title, gross_pay, deductions')
      .not('gross_pay', 'is', null)
      .order('name', { ascending: true }),
    supabase
      .from('purchase_orders')
      .select('id, po_no, supplier, description, total, order_date, po_date, status, category, requested_by, expected_date, payment_terms, priority')
      .order('order_date', { ascending: false }),
    supabase
      .from('quotations')
      .select('id, ref, customer_name, contact, route, mode, amount, quote_date, valid_until, status')
      .order('quote_date', { ascending: false }),
  ]);

  const invoiceRows = invoices.data ?? [];
  const expenseRows = expenses.data ?? [];
  const payrollRows = payroll.data ?? [];
  const purchaseOrderRows = purchaseOrders.data ?? [];
  const quotationRows = quotations.data ?? [];

  const paidInvoices = invoiceRows.filter((i) => i.status === 'Paid');
  const pendingInvoices = invoiceRows.filter((i) => i.status === 'Pending');
  const overdueInvoices = invoiceRows.filter((i) => i.status === 'Overdue');
  const revenue = paidInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const outstandingAmount = [...pendingInvoices, ...overdueInvoices].reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidExpenseRows = expenseRows.filter((e) => e.status === 'Paid');
  const unpaidExpenseRows = expenseRows.filter((e) => e.status !== 'Paid');
  const expenseTotal = paidExpenseRows.reduce((s, e) => s + Number(e.amount || 0), 0);
  const payrollGross = payrollRows.reduce((s, p) => s + Number(p.gross_pay ?? 0), 0);
  const payrollDeductions = payrollRows.reduce((s, p) => s + Number(p.deductions ?? 0), 0);
  const payrollNet = payrollGross - payrollDeductions;
  const vat = Math.round(revenue * VAT_RATE);
  const netPosition = revenue - expenseTotal - payrollNet - vat;
  const approvedQuotes = quotationRows.filter((q) => q.status === 'Approved').length;
  const receivedPOs = purchaseOrderRows.filter((p) => p.status === 'Received').length;
  const orderedPOs = purchaseOrderRows.filter((p) => p.status === 'Ordered').length;
  const procurementValue = purchaseOrderRows.reduce((s, p) => s + Number(p.total || 0), 0);
  const validQuotes = quotationRows.filter((q) => !q.valid_until || new Date(q.valid_until).getTime() >= Date.now()).length;

  const tabClass = (key: string) =>
    `whitespace-nowrap border-b-2 px-1 pb-2 text-[12px] font-semibold transition ${
      view === key
        ? 'border-red-600 text-neutral-900 dark:text-white'
        : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
    }`;

  return (
    <>
      <FinanceLiveRefresh />
      <div className="min-w-0">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600">Live finance data</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Finance</h1>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Invoices, expenses, payroll, procurement and customer quotations.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Synced with Dashboard
          </div>
        </div>

        <div className="mb-2 flex gap-3 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
          <a href="/finance?view=overview" className={tabClass('overview')}>Overview</a>
          <a href="/finance?view=invoices" className={tabClass('invoices')}>Invoices <span className="ml-1 text-[10px] text-neutral-400">{invoiceRows.length}</span></a>
          <a href="/finance?view=expenses" className={tabClass('expenses')}>Expenses <span className="ml-1 text-[10px] text-neutral-400">{expenseRows.length}</span></a>
          <a href="/finance?view=payroll" className={tabClass('payroll')}>Payroll <span className="ml-1 text-[10px] text-neutral-400">{payrollRows.length}</span></a>
          <a href="/finance?view=purchase-orders" className={tabClass('purchase-orders')}>Purchase orders <span className="ml-1 text-[10px] text-neutral-400">{purchaseOrderRows.length}</span></a>
          <a href="/finance?view=quotations" className={tabClass('quotations')}>Quotations <span className="ml-1 text-[10px] text-neutral-400">{quotationRows.length}</span></a>
        </div>

        {view === 'overview' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 border-t-2 border-t-green-500 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Paid revenue</p>
                <p className="mt-1.5 text-xl font-bold text-neutral-900 dark:text-white">{nairaFmt(revenue)}</p>
                <p className="mt-1 text-[10px] text-green-600">{paidInvoices.length} paid invoices</p>
              </div>
              <div className="rounded-xl border border-neutral-200 border-t-2 border-t-amber-500 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Outstanding</p>
                <p className="mt-1.5 text-xl font-bold text-neutral-900 dark:text-white">{nairaFmt(outstandingAmount)}</p>
                <p className="mt-1 text-[10px] text-amber-600">{pendingInvoices.length} pending · {overdueInvoices.length} overdue</p>
              </div>
              <div className="rounded-xl border border-neutral-200 border-t-2 border-t-red-500 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Operating expenses</p>
                <p className="mt-1.5 text-xl font-bold text-neutral-900 dark:text-white">{nairaFmt(expenseTotal)}</p>
                <p className="mt-1 text-[10px] text-neutral-500">{expenseRows.length} recorded entries</p>
              </div>
              <div className="rounded-xl border border-neutral-200 border-t-2 border-t-blue-500 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Net position</p>
                <p className={`mt-1.5 text-xl font-bold ${netPosition >= 0 ? 'text-neutral-900 dark:text-white' : 'text-red-600'}`}>{nairaFmt(netPosition)}</p>
                <p className="mt-1 text-[10px] text-neutral-500">After payroll and VAT</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <a href="/finance?view=invoices" className="rounded-lg border border-neutral-200 bg-white px-3.5 py-3 shadow-sm hover:border-red-300 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">Invoices</p><p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{invoiceRows.length}</p><p className="text-[10px] text-neutral-500">{pendingInvoices.length + overdueInvoices.length} outstanding</p>
              </a>
              <a href="/finance?view=payroll" className="rounded-lg border border-neutral-200 bg-white px-3.5 py-3 shadow-sm hover:border-red-300 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">Payroll</p><p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{nairaFmt(payrollNet)}</p><p className="text-[10px] text-neutral-500">{payrollRows.length} employees</p>
              </a>
              <a href="/finance?view=purchase-orders" className="rounded-lg border border-neutral-200 bg-white px-3.5 py-3 shadow-sm hover:border-red-300 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">Purchase orders</p><p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{purchaseOrderRows.length}</p><p className="text-[10px] text-neutral-500">{receivedPOs} received</p>
              </a>
              <a href="/finance?view=quotations" className="rounded-lg border border-neutral-200 bg-white px-3.5 py-3 shadow-sm hover:border-red-300 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">Quotations</p><p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{quotationRows.length}</p><p className="text-[10px] text-neutral-500">{approvedQuotes} approved</p>
              </a>
            </div>

            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.35fr_.65fr]">
              <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800"><div><h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Financial position</h2><p className="text-[10px] text-neutral-500">Current figures from live finance records</p></div><span className="text-[10px] font-medium text-neutral-400">VAT 7.5%</span></div>
                <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 dark:divide-neutral-800 sm:grid-cols-4 sm:divide-y-0">
                  <div className="p-3.5"><p className="text-[10px] text-neutral-500">Paid revenue</p><p className="mt-1 text-base font-bold text-neutral-900 dark:text-white">{nairaFmt(revenue)}</p></div>
                  <div className="p-3.5"><p className="text-[10px] text-neutral-500">Expenses</p><p className="mt-1 text-base font-bold text-neutral-900 dark:text-white">{nairaFmt(expenseTotal)}</p></div>
                  <div className="p-3.5"><p className="text-[10px] text-neutral-500">Payroll net</p><p className="mt-1 text-base font-bold text-neutral-900 dark:text-white">{nairaFmt(payrollNet)}</p></div>
                  <div className="p-3.5"><p className="text-[10px] text-neutral-500">VAT payable</p><p className="mt-1 text-base font-bold text-neutral-900 dark:text-white">{nairaFmt(vat)}</p></div>
                </div>
              </section>
              <section className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800"><h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Payment health</h2><p className="text-[10px] text-neutral-500">Invoices requiring attention</p></div>
                <div className="space-y-2.5 p-4">
                  <div className="flex items-center justify-between"><span className="text-[11px] text-neutral-500">Paid</span><span className="text-xs font-semibold text-green-600">{paidInvoices.length}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${invoiceRows.length ? (paidInvoices.length / invoiceRows.length) * 100 : 0}%` }} /></div>
                  <div className="flex items-center justify-between"><span className="text-[11px] text-neutral-500">Pending</span><span className="text-xs font-semibold text-amber-600">{pendingInvoices.length}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${invoiceRows.length ? (pendingInvoices.length / invoiceRows.length) * 100 : 0}%` }} /></div>
                  <div className="flex items-center justify-between"><span className="text-[11px] text-neutral-500">Overdue</span><span className="text-xs font-semibold text-red-600">{overdueInvoices.length}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-red-500" style={{ width: `${invoiceRows.length ? (overdueInvoices.length / invoiceRows.length) * 100 : 0}%` }} /></div>
                </div>
              </section>
            </div>
          </div>
        )}

        {view === 'invoices' && (
          <div>
            <SectionHeader title="Invoices" description="Create, review, print and manage customer payment status." action={<NewInvoiceForm />} />
            <TableShell minWidth="1250px">
              <table className="w-full border-collapse table-fixed text-left">
                <colgroup><col className="w-[12%]" /><col className="w-[24%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[12%]" /></colgroup>
                <thead className="bg-neutral-50 dark:bg-neutral-800/60"><tr><th className={wideTh}>Invoice</th><th className={wideTh}>Customer</th><th className={`${wideTh} text-right`}>Subtotal</th><th className={`${wideTh} text-right`}>VAT</th><th className={`${wideTh} text-right`}>Total</th><th className={wideTh}>Date</th><th className={`${wideTh} text-right`}>Payment status</th></tr></thead>
                <tbody>{invoiceRows.map((i) => { const vatAmount = Math.round(Number(i.amount || 0) * VAT_RATE); return <tr key={i.id} className="transition-all duration-200 hover:bg-red-50/40 hover:shadow-[inset_0_0_18px_rgba(239,68,68,0.08)] dark:hover:bg-red-950/10"><td className={wideTd}><InvoiceModal invoiceNo={i.invoice_no} customerName={i.customer_name} amount={i.amount} date={i.invoice_date} status={i.status} autoOpen={i.id === openInvoiceId} /></td><td className={`${wideTd} truncate font-medium`}>{i.customer_name}</td><td className={`${wideTd} whitespace-nowrap text-right`}>{nairaFmt(i.amount)}</td><td className={`${wideTd} whitespace-nowrap text-right`}>{nairaFmt(vatAmount)}</td><td className={`${wideTd} whitespace-nowrap text-right font-semibold`}>{nairaFmt(Number(i.amount || 0) + vatAmount)}</td><td className={`${wideTd} whitespace-nowrap`}><span>{i.invoice_date}</span><span className="ml-1 text-[10px] text-neutral-400">· {dateAge(i.invoice_date)}</span></td><td className={`${wideTd} whitespace-nowrap text-right`}><StatusSwitch id={i.id} status={i.status} /></td></tr>; })}</tbody>
              </table>
              {!invoiceRows.length && <div className="px-4 py-5 text-center text-xs text-neutral-400">No invoices yet.</div>}
            </TableShell>
          </div>
        )}

        {view === 'expenses' && (
          <div>
            <SectionHeader title="Expenses" description="Record company spending, vendors and payment status." action={<NewExpenseForm />} />
            <TableShell minWidth="1180px">
              <table className="w-full border-collapse table-fixed text-left"><colgroup><col className="w-[19%]" /><col className="w-[23%]" /><col className="w-[17%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[16%]" /></colgroup>
                <thead className="bg-neutral-50 dark:bg-neutral-800/60"><tr><th className={wideTh}>Category</th><th className={wideTh}>Vendor</th><th className={`${wideTh} text-right`}>Amount</th><th className={wideTh}>Expense date</th><th className={wideTh}>Age</th><th className={`${wideTh} text-right`}>Payment status</th></tr></thead>
                <tbody>{expenseRows.map((e) => <tr key={e.id} className="transition-all duration-200 hover:bg-red-50/40 hover:shadow-[inset_0_0_18px_rgba(239,68,68,0.08)] dark:hover:bg-red-950/10"><td className={wideTd}><ExpenseReceiptModal category={e.category} vendor={e.vendor} amount={e.amount} date={e.expense_date} status={e.status} /></td><td className={`${wideTd} truncate font-medium`}>{e.vendor}</td><td className={`${wideTd} text-right font-semibold`}>{nairaFmt(e.amount)}</td><td className={wideTd}>{e.expense_date}</td><td className={wideTd}>{dateAge(e.expense_date)}</td><td className={`${wideTd} text-right`}><ExpenseStatusSwitch id={e.id} status={e.status} /></td></tr>)}</tbody>
              </table>
              {!expenseRows.length && <div className="px-4 py-5 text-center text-xs text-neutral-400">No expenses yet. Add your first operating expense.</div>}
            </TableShell>
          </div>
        )}

        {view === 'payroll' && (
          <div>
            <SectionHeader title="Payroll" description="Employee pay, deductions, net pay and printable payslips." action={<NewPayrollForm />} />
            <TableShell minWidth="1180px">
              <table className="w-full border-collapse table-fixed text-left"><colgroup><col className="w-[24%]" /><col className="w-[21%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[13%]" /></colgroup>
                <thead className="bg-neutral-50 dark:bg-neutral-800/60"><tr><th className={wideTh}>Employee</th><th className={wideTh}>Role</th><th className={`${wideTh} text-right`}>Gross</th><th className={`${wideTh} text-right`}>Deductions</th><th className={`${wideTh} text-right`}>Net pay</th><th className={`${wideTh} text-right`}>Document</th></tr></thead>
                <tbody>{payrollRows.map((p) => { const net = Number(p.gross_pay ?? 0) - Number(p.deductions ?? 0); return <tr key={p.id} className="transition-all duration-200 hover:bg-red-50/40 hover:shadow-[inset_0_0_18px_rgba(239,68,68,0.08)] dark:hover:bg-red-950/10"><td className={`${wideTd} font-medium`}><PayslipModal name={p.name} role={p.role_title} grossPay={p.gross_pay ?? 0} deductions={p.deductions ?? 0} /></td><td className={`${wideTd} truncate`}>{p.role_title}</td><td className={`${wideTd} text-right`}>{nairaFmt(p.gross_pay ?? 0)}</td><td className={`${wideTd} text-right`}>{nairaFmt(p.deductions ?? 0)}</td><td className={`${wideTd} text-right font-semibold`}>{nairaFmt(net)}</td><td className={`${wideTd} text-right`}><span className={statusBadge('Approved')}>Payslip</span></td></tr>; })}</tbody>
              </table>
              {!payrollRows.length && <div className="px-4 py-5 text-center text-xs text-neutral-400">No payroll entries yet.</div>}
            </TableShell>
          </div>
        )}

        {view === 'purchase-orders' && (
          <div className="space-y-2">
            <SectionHeader title="Purchase orders" description="Procurement control for suppliers, fleet parts, services and everyday operating purchases." action={<NewPurchaseOrderForm />} />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Total POs</p><p className="mt-1 text-lg font-bold">{purchaseOrderRows.length}</p><p className="text-[10px] text-neutral-500">{orderedPOs} ordered · {receivedPOs} received</p></div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Procurement value</p><p className="mt-1 text-lg font-bold">{nairaFmt(procurementValue)}</p><p className="text-[10px] text-neutral-500">Before VAT</p></div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Suppliers</p><p className="mt-1 text-lg font-bold">{new Set(purchaseOrderRows.map((p) => p.supplier)).size}</p><p className="text-[10px] text-neutral-500">Active supplier records</p></div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Typical use</p><p className="mt-1 text-sm font-bold">Fleet · Fuel · Parts</p><p className="text-[10px] text-neutral-500">Services · Office · Vendors</p></div>
            </div>
            <TableShell minWidth="1420px">
              <table className="w-full border-collapse table-fixed text-left"><colgroup><col className="w-[9%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[19%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[9%]" /></colgroup>
                <thead className="bg-neutral-50 dark:bg-neutral-800/60"><tr><th className={th}>PO no.</th><th className={th}>Supplier</th><th className={th}>Category</th><th className={th}>Items / service</th><th className={th}>Requested by</th><th className={th}>Order date</th><th className={th}>Expected</th><th className={`${th} text-right`}>Total</th><th className={`${th} text-right`}>Status</th></tr></thead>
                <tbody>{purchaseOrderRows.map((po) => { const vatAmount = Math.round(Number(po.total || 0) * VAT_RATE); return <tr key={po.id} className="transition-all duration-200 hover:bg-red-50/40 hover:shadow-[inset_0_0_18px_rgba(239,68,68,0.08)] dark:hover:bg-red-950/10"><td className={td}><PurchaseOrderModal poNo={po.po_no} supplier={po.supplier} description={po.description} total={po.total} date={po.order_date || po.po_date} status={po.status} category={po.category} requestedBy={po.requested_by} expectedDate={po.expected_date} paymentTerms={po.payment_terms} priority={po.priority} /></td><td className={`${td} truncate font-medium`}>{po.supplier}</td><td className={`${td} truncate`}>{po.category || 'General'}</td><td className={`${td} truncate`}>{po.description || 'General procurement'}</td><td className={`${td} truncate`}>{po.requested_by || '—'}</td><td className={td}>{po.order_date || po.po_date || '—'}</td><td className={td}>{po.expected_date || '—'}</td><td className={`${td} text-right font-semibold`}>{nairaFmt(Number(po.total || 0) + vatAmount)}</td><td className={`${td} text-right`}><PurchaseOrderStatusSwitch id={po.id} status={po.status} /></td></tr>; })}</tbody>
              </table>
              {!purchaseOrderRows.length && <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-3"><div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.10)]"><b className="text-neutral-800">Fleet purchases</b><br/>Track tyres, batteries, spare parts, repairs and fuel suppliers.</div><div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.10)]"><b className="text-neutral-800">Business purchases</b><br/>Office supplies, equipment, software and recurring services.</div><div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.10)]"><b className="text-neutral-800">Control</b><br/>Capture who requested the purchase, delivery date and status.</div></div>}
            </TableShell>
          </div>
        )}

        {view === 'quotations' && (
          <div className="space-y-2">
            <SectionHeader title="Quotations" description="Customer pricing, routes, service mode, validity and approval status." action={<NewQuotationForm />} />
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Total quotes</p><p className="mt-1 text-lg font-bold">{quotationRows.length}</p><p className="text-[10px] text-neutral-500">{approvedQuotes} approved</p></div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Quote pipeline</p><p className="mt-1 text-lg font-bold">{nairaFmt(quotationRows.reduce((s, q) => s + Number(q.amount || 0), 0))}</p><p className="text-[10px] text-neutral-500">Total quoted value</p></div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Valid quotes</p><p className="mt-1 text-lg font-bold">{validQuotes}</p><p className="text-[10px] text-neutral-500">Within validity date</p></div>
              <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_18px_rgba(239,68,68,0.14)] dark:hover:border-red-900/70 dark:hover:shadow-[0_0_18px_rgba(239,68,68,0.12)]"><p className="text-[10px] uppercase tracking-wide text-neutral-500">Use cases</p><p className="mt-1 text-sm font-bold">Haulage · Freight</p><p className="text-[10px] text-neutral-500">Delivery · Logistics services</p></div>
            </div>
            <TableShell minWidth="1280px">
              <table className="w-full border-collapse table-fixed text-left"><colgroup><col className="w-[10%]" /><col className="w-[17%]" /><col className="w-[22%]" /><col className="w-[10%]" /><col className="w-[11%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[10%]" /></colgroup>
                <thead className="bg-neutral-50 dark:bg-neutral-800/60"><tr><th className={th}>Reference</th><th className={th}>Customer</th><th className={th}>Route / service</th><th className={th}>Mode</th><th className={`${th} text-right`}>Value</th><th className={th}>Quote date</th><th className={th}>Valid until</th><th className={`${th} text-right`}>Status</th></tr></thead>
                <tbody>{quotationRows.map((q) => <tr key={q.id} className="transition-all duration-200 hover:bg-red-50/40 hover:shadow-[inset_0_0_18px_rgba(239,68,68,0.08)] dark:hover:bg-red-950/10"><td className={td}><QuotationModal reference={q.ref} customer={q.customer_name} route={q.route} amount={q.amount} status={q.status} /></td><td className={`${td} truncate font-medium`}>{q.customer_name}</td><td className={`${td} truncate`}>{q.route || 'Logistics service'}</td><td className={`${td} truncate`}>{q.mode || 'Road'}</td><td className={`${td} text-right font-semibold`}>{nairaFmt(q.amount)}</td><td className={td}>{q.quote_date}</td><td className={td}>{q.valid_until || '—'}</td><td className={`${td} text-right`}><QuotationStatusSwitch id={q.id} status={q.status} /></td></tr>)}</tbody>
              </table>
              {!quotationRows.length && <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-3"><div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.10)]"><b className="text-neutral-800">Logistics quote</b><br/>Build customer pricing for haulage, freight, delivery and routes.</div><div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.10)]"><b className="text-neutral-800">Sales workflow</b><br/>Move quotes from Pending to Approved or Declined.</div><div className="rounded-lg border border-dashed border-neutral-200 p-3 text-xs text-neutral-500 transition-all duration-200 hover:border-red-300 hover:shadow-[0_0_16px_rgba(239,68,68,0.10)]"><b className="text-neutral-800">Follow-up</b><br/>Track validity dates so expired quotes do not get reused.</div></div>}
            </TableShell>
          </div>
        )}
      </div>
    </>
  );
}
