'use client';

import { useState } from 'react';

type Item = {
  id: string;
  sku: string;
  name: string;
  qty: number;
  reorder_level: number;
  location: string | null;
};

export default function ItemDetails({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);

  function printDetails() {
    const popup = window.open('', '_blank', 'width=850,height=750');
    if (!popup) return;

    const safe = (v: unknown) => String(v ?? 'Not recorded')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

    popup.document.write(`
      <!doctype html><html><head><title>${safe(item.name)} - JAAD ERP</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111}
        h1{margin:0 0 5px}.muted{color:#666;margin-bottom:22px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .box{border:1px solid #ddd;border-radius:8px;padding:13px}
        .label{font-size:10px;text-transform:uppercase;color:#777}.value{font-weight:600;margin-top:5px}
        button{margin-top:25px;padding:10px 15px;border:0;border-radius:7px;background:#dc2626;color:white}
        @media print{button{display:none}}
      </style></head><body>
      <h1>${safe(item.name)}</h1><div class="muted">JAAD ERP Warehouse Inventory Record</div>
      <div class="grid">
        <div class="box"><div class="label">SKU</div><div class="value">${safe(item.sku)}</div></div>
        <div class="box"><div class="label">Quantity</div><div class="value">${safe(item.qty)} units</div></div>
        <div class="box"><div class="label">Status</div><div class="value">${safe(item.qty < 35 ? 'Low stock' : 'In stock')}</div></div>
        <div class="box"><div class="label">Reorder level</div><div class="value">${safe(item.reorder_level)}</div></div>
        <div class="box"><div class="label">Location</div><div class="value">${safe(item.location)}</div></div>
        <div class="box"><div class="label">Record ID</div><div class="value">${safe(item.id)}</div></div>
      </div>
      <button onclick="window.print()">Print / Save as PDF</button>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 200);
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button type="button" onClick={() => setOpen(v => !v)} className="truncate text-left font-medium text-neutral-800 underline decoration-dotted underline-offset-4 dark:text-neutral-200">
        {item.name}
      </button>

      {open && (
        <span
          onMouseEnter={() => setOpen(true)}
          className="absolute left-0 top-6 z-50 w-80 rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-red-500">Inventory details</span>
          <span className="mt-1 block text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</span>
          <span className="mt-1 block text-xs text-neutral-500">{item.sku} · {item.location ?? 'No location'}</span>

          <span className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800"><b>Stock</b><br/>{item.qty} units</span>
            <span className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800"><b>Status</b><br/>{item.qty < 35 ? 'Low stock' : 'In stock'}</span>
            <span className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800"><b>Reorder</b><br/>{item.reorder_level}</span>
            <span className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800"><b>Location</b><br/>{item.location ?? 'Not assigned'}</span>
          </span>

          <button type="button" onClick={printDetails} className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">
            Print / Save PDF
          </button>
        </span>
      )}
    </span>
  );
}
