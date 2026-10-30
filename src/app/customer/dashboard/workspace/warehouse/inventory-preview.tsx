'use client';

import React, { useState } from 'react';
import logo from './JAAD_LOGISTICS_LOGO.jpeg';
import EditItemForm from './edit-item-form';

type Item = {
  id?: string;
  sku: string;
  name: string;
  description?: string | null;
  qty: number;
  reorder_level: number;
  location: string | null;
  storage_type?: string | null;
  zone?: string | null;
  rack?: string | null;
  bin?: string | null;
  unit?: string | null;
  batch_no?: string | null;
  expiry_date?: string | null;
  supplier?: string | null;
  temperature_c?: number | null;
  notes?: string | null;
};

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function value(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export default function InventoryPreview({ item, children }: { item: Item; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const low = Number(item.qty ?? 0) < 35;
  const logoSrc = typeof logo === 'string' ? logo : logo.src;

  function openPrintWindow(title: string, body: string, orientation: 'portrait' | 'landscape') {
    const win = window.open('', '_blank', 'width=1100,height=820');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page{size:A4 ${orientation};margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0}header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #e50914;padding-bottom:12px;margin-bottom:18px}header img{width:145px;height:auto;object-fit:contain}h1{font-size:21px;margin:0 0 4px}.muted{font-size:11px;color:#666}.meta{margin-left:auto;text-align:right;font-size:10px;color:#666}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}th,td{border:1px solid #d3d3d3;padding:8px;text-align:left;vertical-align:top;word-break:break-word}th{width:30%;background:#f4f4f4;color:#555;text-transform:uppercase;font-size:9px;letter-spacing:.05em}.status-low{color:#d60000;font-weight:700}.status-ok{color:#008a3e;font-weight:700}.description{white-space:pre-wrap;line-height:1.45}.footer{margin-top:18px;border-top:1px solid #ddd;padding-top:9px;color:#777;font-size:9px}.print{margin-top:18px;border:0;background:#e50914;color:#fff;padding:10px 16px;border-radius:5px;font-weight:700;cursor:pointer}@media print{.print{display:none}}
    </style></head><body><header><img src="${esc(logoSrc)}" alt="JAAD Logistics"><div><h1>${esc(title)}</h1><div class="muted">Official JAAD ERP warehouse inventory document</div></div><div class="meta">JAAD LOGISTICS<br>${new Date().toLocaleString('en-NG')}</div></header>${body}<div class="footer">Generated from JAAD ERP Warehouse. This document reflects the inventory record at the time of printing.</div><button class="print" onclick="window.print()">Print / Save as PDF</button></body></html>`);
    win.document.close();
    win.focus();
  }

  function printDetails() {
    const rows: Array<[string, string, string?]> = [
      ['SKU', value(item.sku)],
      ['Item', value(item.name)],
      ['Description / full details', value(item.description)],
      ['Quantity', `${value(item.qty)} ${value(item.unit || 'units')}`],
      ['Reorder level', `${value(item.reorder_level)} ${value(item.unit || 'units')}`],
      ['Status', low ? 'Low stock' : 'In stock', low ? 'status-low' : 'status-ok'],
      ['Storage type', value(item.storage_type)],
      ['Location / warehouse', value(item.location)],
      ['Zone', value(item.zone)],
      ['Rack', value(item.rack)],
      ['Bin', value(item.bin)],
      ['Batch / lot number', value(item.batch_no)],
      ['Expiry date', value(item.expiry_date)],
      ['Supplier', value(item.supplier)],
      ['Temperature °C', value(item.temperature_c)],
      ['Notes', value(item.notes)],
    ];
    const body = `<table><tbody>${rows.map(([key, val, cls]) => `<tr><th>${esc(key)}</th><td class="${cls ?? ''} ${key.includes('Description') || key === 'Notes' ? 'description' : ''}">${esc(val)}</td></tr>`).join('')}</tbody></table>`;
    openPrintWindow(`Inventory Record — ${item.sku}`, body, 'portrait');
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block max-w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1" aria-label={`Open inventory details for ${item.sku}`}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-800">
              <div><div className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Inventory details</div><h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</h2><div className="font-mono text-xs text-neutral-500">{item.sku}</div></div>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Quantity</div><div className="mt-1 text-sm font-semibold">{item.qty} {item.unit || 'units'}</div></div>
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Reorder level</div><div className="mt-1 text-sm font-semibold">{item.reorder_level} {item.unit || 'units'}</div></div>
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Storage</div><div className="mt-1 text-sm font-semibold">{item.storage_type || 'Ambient'}</div></div>
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60"><div className="text-[10px] uppercase tracking-wide text-neutral-400">Status</div><div className={`mt-1 text-sm font-semibold ${low ? 'text-red-500' : 'text-green-600'}`}>{low ? 'Low stock' : 'In stock'}</div></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
              <div><span className="text-xs text-neutral-400">Location</span><div className="font-medium">{item.location || '—'}</div></div>
              <div><span className="text-xs text-neutral-400">Zone / Rack / Bin</span><div className="font-medium">{[item.zone, item.rack, item.bin].filter(Boolean).join(' / ') || '—'}</div></div>
              <div><span className="text-xs text-neutral-400">Batch / Lot</span><div className="font-medium">{item.batch_no || '—'}</div></div>
              <div><span className="text-xs text-neutral-400">Expiry</span><div className="font-medium">{item.expiry_date || '—'}</div></div>
              <div><span className="text-xs text-neutral-400">Supplier</span><div className="font-medium">{item.supplier || '—'}</div></div>
              <div><span className="text-xs text-neutral-400">Temperature</span><div className="font-medium">{item.temperature_c === null || item.temperature_c === undefined ? '—' : `${item.temperature_c} °C`}</div></div>
              <div className="col-span-2"><span className="text-xs text-neutral-400">Description</span><div className="mt-1 whitespace-pre-wrap font-medium leading-5">{item.description || '—'}</div></div>
              <div className="col-span-2"><span className="text-xs text-neutral-400">Notes</span><div className="mt-1 whitespace-pre-wrap font-medium leading-5">{item.notes || '—'}</div></div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <EditItemForm item={item} />
              <button type="button" onClick={printDetails} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">Print / Save as PDF</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
