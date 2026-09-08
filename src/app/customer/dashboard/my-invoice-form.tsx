'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type LineItem = { description: string; quantity: string; unit_price: string };

const emptyItem = (): LineItem => ({ description: '', quantity: '1', unit_price: '' });

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: '\u20a6', USD: '$', GBP: '\u00a3', EUR: '\u20ac', GHS: '\u20b5', KES: 'KSh', ZAR: 'R' };

type Props = {
  onCreated?: () => void;
  currency?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  initialItem?: Partial<LineItem>;
};

export default function MyInvoiceForm({ onCreated, currency, open: openProp, onOpenChange, hideTrigger, initialItem }: Props) {
  const symbol = CURRENCY_SYMBOLS[currency ?? 'NGN'] ?? currency ?? '\u20a6';
  const supabase = createClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem(), ...initialItem }]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateItem(i: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0);
  const tax = subtotal * 0.075;
  const total = subtotal + tax;

  function reset() {
    setOpen(false);
    setClientName('');
    setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
    setItems([{ ...emptyItem(), ...initialItem }]);
    setLogoFile(null);
    setLogoPreview(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientName.trim() || items.every((it) => !it.description.trim())) {
      setError('Client name and at least one line item are required.');
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('invoice-logos').upload(path, logoFile);
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
      const { data: pub } = supabase.storage.from('invoice-logos').getPublicUrl(path);
      logoUrl = pub.publicUrl;
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_own_invoices')
      .insert({
        user_id: user.id,
        invoice_no: invoiceNo,
        currency: currency ?? 'NGN',
        client_name: clientName,
        logo_url: logoUrl,
        subtotal,
        tax,
        total,
        status: 'Unpaid',
      })
      .select('id')
      .single();

    if (invoiceError) {
      setError(invoiceError.message);
      setSaving(false);
      return;
    }

    const validItems = items.filter((it) => it.description.trim());
    const rows = validItems.map((it) => ({
      invoice_id: invoice.id,
      description: it.description,
      quantity: parseFloat(it.quantity) || 0,
      unit_price: parseFloat(it.unit_price) || 0,
      amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
    }));

    if (rows.length) {
      const { error: itemsError } = await supabase.from('customer_own_invoice_items').insert(rows);
      if (itemsError) {
        setError(itemsError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    reset();
    onCreated?.();
  }

  if (!open) {
    if (hideTrigger) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#c91d16]"
      >
        + Create invoice
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text)]">Create invoice</h3>
          <button type="button" onClick={reset} className="text-[13px] font-semibold text-[var(--subtext)]">
            Close
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--input-border)] bg-[var(--input-bg)] text-[10px] text-[var(--subtext)]"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              'Logo'
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[13px] font-semibold text-[#e5231b]"
            >
              Upload your logo
            </button>
            <p className="text-[11px] text-[var(--subtext)]">Shown on your invoice. Optional.</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Invoice no.</label>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Client name</label>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
        </div>

        <div className="mb-2 text-[11px] font-bold uppercase text-[var(--subtext)]">Line items</div>
        <div className="mb-2 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-6 gap-1.5 rounded-md border border-[var(--border)] p-2">
              <input
                placeholder="Description"
                value={it.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                className="col-span-3 rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[#e5231b]"
              />
              <input
                type="number"
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[#e5231b]"
              />
              <input
                type="number"
                placeholder="Unit price"
                value={it.unit_price}
                onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[#e5231b]"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[var(--subtext)] hover:text-[#e5231b]"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mb-5 text-xs font-semibold text-[#e5231b] hover:underline"
        >
          + Add item
        </button>

        <div className="mb-5 space-y-1.5 rounded-md border border-[var(--border)] p-3.5 text-sm">
          <div className="flex justify-between text-[var(--subtext)]">
            <span>Subtotal</span>
            <span>{symbol}{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[var(--subtext)]">
            <span>Tax (7.5%)</span>
            <span>{symbol}{tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-1.5 text-base font-bold text-[var(--text)]">
            <span>Total</span>
            <span>{symbol}{total.toLocaleString()}</span>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-[var(--error-text)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-sm border border-[var(--input-border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--subtext)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
