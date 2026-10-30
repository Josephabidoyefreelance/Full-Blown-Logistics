'use client';

import logo from './JAAD_LOGISTICS_LOGO.jpeg';

type Item = {
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

export default function PrintInventoryButton({ items }: { items: Item[] }) {
  function printRegister() {
    const win = window.open('', '_blank', 'width=1300,height=850');
    if (!win) return;
    const logoSrc = typeof logo === 'string' ? logo : logo.src;
    const rows = items.map((item) => {
      const low = Number(item.qty ?? 0) < 35;
      const location = [item.location, item.zone, item.rack, item.bin].filter(Boolean).join(' / ') || '—';
      return `<tr><td>${esc(item.sku)}</td><td>${esc(item.name)}</td><td class="center">${Number(item.qty ?? 0)} ${esc(item.unit || 'units')}</td><td>${esc(location)}</td><td>${esc(item.storage_type || 'Ambient')}</td><td class="center ${low ? 'low' : 'ok'}">${low ? 'Low stock' : 'In stock'}</td><td class="center">${Number(item.reorder_level ?? 0)} ${esc(item.unit || 'units')}</td></tr>`;
    }).join('');

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>JAAD Logistics - Inventory Register</title><style>
      @page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0}header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #e50914;padding-bottom:11px;margin-bottom:13px}header img{width:140px;height:auto;object-fit:contain}h1{font-size:20px;margin:0 0 3px}.muted{font-size:10px;color:#666}.meta{margin-left:auto;text-align:right;font-size:9px;color:#666}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.5px}th,td{border:1px solid #cfcfcf;padding:6px 7px;text-align:left;vertical-align:top;word-break:break-word}th{background:#f2f2f2;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#555}th:nth-child(1){width:14%}th:nth-child(2){width:18%}th:nth-child(3){width:12%;text-align:center}th:nth-child(4){width:18%}th:nth-child(5){width:13%}th:nth-child(6){width:12%;text-align:center}th:nth-child(7){width:13%;text-align:center}.center{text-align:center}.low{color:#d60000;font-weight:700}.ok{color:#008a3e;font-weight:700}.footer{margin-top:12px;font-size:8.5px;color:#777}.print{margin-top:14px;border:0;background:#e50914;color:#fff;padding:9px 14px;border-radius:5px;font-weight:700;cursor:pointer}@media print{.print{display:none}}
    </style></head><body><header><img src="${esc(logoSrc)}" alt="JAAD Logistics"><div><h1>Warehouse Inventory Register</h1><div class="muted">Official JAAD Logistics inventory statement · ${items.length} record${items.length === 1 ? '' : 's'}</div></div><div class="meta">JAAD LOGISTICS<br>${new Date().toLocaleString('en-NG')}</div></header><table><thead><tr><th>SKU</th><th>Item</th><th>Quantity (units)</th><th>Location / Bin</th><th>Storage type</th><th>Status</th><th>Reorder level (units)</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No inventory records.</td></tr>'}</tbody></table><div class="footer">Generated from JAAD ERP Warehouse. For official operational inventory communication and record keeping.</div><button class="print" onclick="window.print()">Print / Save as PDF</button></body></html>`);
    win.document.close();
    win.focus();
  }

  return <button type="button" onClick={printRegister} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800">Print register</button>;
}
