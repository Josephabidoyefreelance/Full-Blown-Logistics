'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MyInvoiceForm from './my-invoice-form';

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: '\u20a6', USD: '$', GBP: '\u00a3', EUR: '\u20ac', GHS: '\u20b5', KES: 'KSh', ZAR: 'R' };
function symbolFor(code?: string | null) {
  return CURRENCY_SYMBOLS[code ?? 'NGN'] ?? code ?? '\u20a6';
}

type OwnInvoice = {
  id: string;
  invoice_no: string;
  client_name: string;
  logo_url: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  currency: string | null;
};

const STATUS_OPTIONS = ['Unpaid', 'Pending', 'Paid'];
const STATUS_COLORS: Record<string, string> = {
  Paid: '#1f9d5c',
  Pending: '#ca8a04',
  Unpaid: '#e2362b',
};

type OwnInvoiceItem = { id: string; description: string; quantity: number; unit_price: number; amount: number };

function OwnInvoiceDetail({
  invoice,
  onClose,
  onStatusChange,
}: {
  invoice: OwnInvoice;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<OwnInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(invoice.status);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('customer_own_invoice_items')
        .select('id, description, quantity, unit_price, amount')
        .eq('invoice_id', invoice.id);
      setItems(data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStatusChange(next: string) {
    setSavingStatus(true);
    const { error } = await supabase
      .from('customer_own_invoices')
      .update({ status: next })
      .eq('id', invoice.id);
    setSavingStatus(false);
    if (!error) {
      setStatus(next);
      onStatusChange(invoice.id, next);
    }
  }

  function handlePrint() {
    window.print();
  }

  const issueDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const sym = symbolFor(invoice.currency);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8 print:bg-white print:p-0" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] overflow-hidden rounded-lg border border-[var(--border)] bg-white p-8 text-black print:w-[210mm] print:max-w-none print:rounded-none print:border-0 print:p-10 print:shadow-none"
      >
        <div
          className="pointer-events-none absolute right-10 top-32 z-10 select-none rounded-md border-4 px-4 py-1.5 text-lg font-black uppercase tracking-widest opacity-90"
          style={{
            color: STATUS_COLORS[status] ?? '#ca8a04',
            borderColor: STATUS_COLORS[status] ?? '#ca8a04',
            transform: 'rotate(-14deg)',
          }}
        >
          {status}
        </div>

        <div className="mb-6 flex items-center justify-between print:hidden">
          <span className="text-sm font-bold text-neutral-900">Invoice</span>
          <div className="flex items-center gap-4">
            <button onClick={handlePrint} className="text-[13px] font-semibold text-[#e5231b]">
              Print
            </button>
            <button onClick={handlePrint} className="text-[13px] font-semibold text-[#e5231b]">
              Download PDF
            </button>
            <button onClick={onClose} className="text-[13px] font-semibold text-neutral-500">
              Close
            </button>
          </div>
        </div>

        <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
          <div>
            {invoice.logo_url ? (
              <img src={invoice.logo_url} alt="Logo" className="mb-2 h-12 object-contain" />
            ) : (
              <div className="text-lg font-bold text-neutral-900">{invoice.client_name ? 'Your business' : ''}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold uppercase tracking-wide text-neutral-900">Invoice</div>
            <div className="text-[12px] text-neutral-500">{invoice.invoice_no}</div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-[1fr_60px_100px_110px] gap-2 text-sm">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Billed to</div>
            <div className="mt-0.5 font-medium text-neutral-900">{invoice.client_name}</div>
          </div>
          <div className="whitespace-nowrap">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Date issued</div>
            <div className="mt-0.5 font-medium text-neutral-900">{issueDate}</div>
          </div>
          <div />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Status</div>
            <div className="mt-0.5 print:hidden">
              <select
                value={status}
                disabled={savingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none disabled:opacity-60"
                style={{
                  backgroundColor: (STATUS_COLORS[status] ?? '#ca8a04') + '1a',
                  color: STATUS_COLORS[status] ?? '#ca8a04',
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mt-0.5 hidden print:block">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: (STATUS_COLORS[status] ?? '#ca8a04') + '1a',
                  color: STATUS_COLORS[status] ?? '#ca8a04',
                }}
              >
                {status}
              </span>
            </div>
          </div>
        </div>


        <div className="mb-6 overflow-hidden rounded-md border border-neutral-200">
          <div className="grid grid-cols-[1fr_60px_100px_110px] gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            <div>Description</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Price</div>
            <div className="text-right">Amount</div>
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-neutral-500">Loading...</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="grid grid-cols-[1fr_60px_100px_110px] gap-2 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
                <div className="text-neutral-900">{it.description}</div>
                <div className="text-right text-neutral-900">{it.quantity}</div>
                <div className="text-right text-neutral-900">{sym}{it.unit_price.toLocaleString()}</div>
                <div className="text-right text-neutral-900">{sym}{it.amount.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>

        <div className="mb-8 flex justify-end">
          <div className="w-full max-w-[240px] space-y-1.5 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span><span>{sym}{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Tax (7.5%)</span><span>{sym}{invoice.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold text-neutral-900">
              <span>Total due</span><span>{sym}{invoice.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-400">
          Thank you for your business.
        </div>
      </div>
    </div>
  );
}

export default function MyInvoicesTab({
  onChange,
  currency,
  initialItem,
  onInitialItemConsumed,
}: {
  onChange?: () => void;
  currency?: string;
  initialItem?: { description: string; quantity: string };
  onInitialItemConsumed?: () => void;
}) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<OwnInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OwnInvoice | null>(null);
  const [autoFormOpen, setAutoFormOpen] = useState(!!initialItem);

  useEffect(() => {
    if (initialItem) setAutoFormOpen(true);
  }, [initialItem]);

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchInvoices() {
    setLoading(true);
    const { data } = await supabase
      .from('customer_own_invoices')
      .select('id, invoice_no, client_name, logo_url, subtotal, tax, total, status, currency')
      .order('created_at', { ascending: false });
    setInvoices(data ?? []);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-[var(--text)]">My invoices</h4>
        <MyInvoiceForm
          currency={currency}
          open={initialItem ? autoFormOpen : undefined}
          onOpenChange={initialItem ? (o) => {
            setAutoFormOpen(o);
            if (!o) onInitialItemConsumed?.();
          } : undefined}
          hideTrigger={!!initialItem}
          initialItem={initialItem}
          onCreated={() => {
            fetchInvoices();
            onChange?.();
            onInitialItemConsumed?.();
          }}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
          Loading...
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
          No invoices created yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between border-b border-[var(--border)] p-4 last:border-b-0"
            >
              <div>
                <button onClick={() => setSelected(inv)} className="text-sm font-semibold text-[var(--text)] hover:underline">
                  {inv.invoice_no}
                </button>
                <div className="text-[12px] text-[var(--subtext)]">{inv.client_name}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: (STATUS_COLORS[inv.status] ?? '#ca8a04') + '1a',
                    color: STATUS_COLORS[inv.status] ?? '#ca8a04',
                  }}
                >
                  {inv.status}
                </span>
                <span className="text-sm font-bold text-[var(--text)]">
                  {symbolFor(inv.currency)}{inv.total.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <OwnInvoiceDetail
          invoice={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(id, status) => {
            setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
            setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
            onChange?.();
          }}
        />
      )}
    </div>
  );
}
