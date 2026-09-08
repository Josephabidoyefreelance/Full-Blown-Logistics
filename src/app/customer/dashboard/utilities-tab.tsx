'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

type Row = { label: string; value: string };

function printRows(title: string, rows: Row[]) {
  const win = window.open('', '_blank', 'width=480,height=640');
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 10px;color:#555;">${r.label}</td><td style="padding:6px 10px;text-align:right;font-weight:600;">${r.value}</td></tr>`
    )
    .join('');
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p { font-size: 12px; color: #888; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          tr { border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>
        <table>${rowsHtml}</table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function downloadRows(title: string, rows: Row[]) {
  const lines = [title, `Generated,${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, ''];
  rows.forEach((r) => lines.push(`"${r.label}","${r.value}"`));
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Field({
  label,
  value,
  onChange,
  suffix,
  type = 'number',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
        />
        {suffix && <span className="shrink-0 text-[12px] text-[var(--subtext)]">{suffix}</span>}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] py-2 first:border-t-0">
      <span className="text-[13px] text-[var(--subtext)]">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-[#e5231b]' : 'text-[var(--text)]'}`}>{value}</span>
    </div>
  );
}

function ToolCard({
  title,
  description,
  rows,
  children,
  accentColor,
}: {
  title: string;
  description: string;
  rows: Row[];
  children: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold text-[var(--text)]">{title}</h4>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => printRows(title, rows)}
            className="rounded-sm border border-[var(--input-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)]"
          >
            Print
          </button>
          <button
            onClick={() => downloadRows(title, rows)}
            className="rounded-sm border border-[var(--input-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)]"
          >
            Download
          </button>
        </div>
      </div>
      <p className="mb-4 text-[12px] text-[var(--subtext)]">{description}</p>
      {children}
    </div>
  );
}

function num(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function ChargeableWeightTool() {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [divisor, setDivisor] = useState('5000');
  const [actualWeight, setActualWeight] = useState('');

  const volumetric = (num(length) * num(width) * num(height)) / (num(divisor) || 1);
  const chargeable = Math.max(volumetric, num(actualWeight));

  const rows: Row[] = [
    { label: 'Length (cm)', value: length || '0' },
    { label: 'Width (cm)', value: width || '0' },
    { label: 'Height (cm)', value: height || '0' },
    { label: 'Divisor', value: divisor || '0' },
    { label: 'Actual weight (kg)', value: actualWeight || '0' },
    { label: 'Volumetric weight', value: `${volumetric.toFixed(2)} kg` },
    { label: 'Chargeable weight', value: `${chargeable.toFixed(2)} kg` },
  ];

  return (
    <ToolCard accentColor="#d64141" title="Chargeable weight calculator" description="Dimensions in cm, weight in kg. Divisor is usually 5000 for air freight, 6000 for courier." rows={rows}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Length" value={length} onChange={setLength} suffix="cm" />
        <Field label="Width" value={width} onChange={setWidth} suffix="cm" />
        <Field label="Height" value={height} onChange={setHeight} suffix="cm" />
        <Field label="Divisor" value={divisor} onChange={setDivisor} />
      </div>
      <div className="mt-3">
        <Field label="Actual weight" value={actualWeight} onChange={setActualWeight} suffix="kg" />
      </div>
      <div className="mt-4">
        <ResultRow label="Volumetric weight" value={`${volumetric.toFixed(2)} kg`} />
        <ResultRow label="Actual weight" value={`${num(actualWeight).toFixed(2)} kg`} />
        <ResultRow label="Chargeable weight" value={`${chargeable.toFixed(2)} kg`} highlight />
      </div>
    </ToolCard>
  );
}

function CbmTool() {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [qty, setQty] = useState('1');

  const cbmPerUnit = (num(length) * num(width) * num(height)) / 1000000;
  const totalCbm = cbmPerUnit * (num(qty) || 0);

  const rows: Row[] = [
    { label: 'Length (cm)', value: length || '0' },
    { label: 'Width (cm)', value: width || '0' },
    { label: 'Height (cm)', value: height || '0' },
    { label: 'Quantity', value: qty || '0' },
    { label: 'CBM per unit', value: `${cbmPerUnit.toFixed(4)} m3` },
    { label: 'Total CBM', value: `${totalCbm.toFixed(4)} m3` },
  ];

  return (
    <ToolCard accentColor="#d66641" title="CBM calculator" description="Dimensions in cm. Converts to cubic meters." rows={rows}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Length" value={length} onChange={setLength} suffix="cm" />
        <Field label="Width" value={width} onChange={setWidth} suffix="cm" />
        <Field label="Height" value={height} onChange={setHeight} suffix="cm" />
        <Field label="Quantity" value={qty} onChange={setQty} />
      </div>
      <div className="mt-4">
        <ResultRow label="CBM per unit" value={`${cbmPerUnit.toFixed(4)} m\u00b3`} />
        <ResultRow label="Total CBM" value={`${totalCbm.toFixed(4)} m\u00b3`} highlight />
      </div>
    </ToolCard>
  );
}

function FreightCostTool() {
  const [chargeableWeight, setChargeableWeight] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [fuelSurchargePct, setFuelSurchargePct] = useState('0');
  const [otherFees, setOtherFees] = useState('0');

  const base = num(chargeableWeight) * num(ratePerKg);
  const fuelSurcharge = base * (num(fuelSurchargePct) / 100);
  const total = base + fuelSurcharge + num(otherFees);

  const rows: Row[] = [
    { label: 'Chargeable weight (kg)', value: chargeableWeight || '0' },
    { label: 'Rate per kg', value: ratePerKg || '0' },
    { label: 'Fuel surcharge %', value: fuelSurchargePct || '0' },
    { label: 'Other fees', value: otherFees || '0' },
    { label: 'Base freight', value: base.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Fuel surcharge amount', value: fuelSurcharge.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Total freight cost', value: total.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];

  return (
    <ToolCard accentColor="#d68c41" title="Freight cost calculator" description="Base cost plus fuel surcharge and any other fees." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Chargeable weight" value={chargeableWeight} onChange={setChargeableWeight} suffix="kg" />
        <Field label="Rate per kg" value={ratePerKg} onChange={setRatePerKg} />
        <Field label="Fuel surcharge" value={fuelSurchargePct} onChange={setFuelSurchargePct} suffix="%" />
        <Field label="Other fees" value={otherFees} onChange={setOtherFees} />
      </div>
      <div className="mt-4">
        <ResultRow label="Base freight" value={base.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Fuel surcharge" value={fuelSurcharge.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Other fees" value={num(otherFees).toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Total freight cost" value={total.toLocaleString(undefined, { maximumFractionDigits: 2 })} highlight />
      </div>
    </ToolCard>
  );
}

const FX_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD'];

function CurrencyConverterTool() {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('NGN');
  const [to, setTo] = useState('USD');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function fetchRates(base: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await res.json();
      if (data.result !== 'success') throw new Error('Rate lookup failed');
      setRates(data.rates);
      setUpdatedAt(data.time_last_update_utc);
    } catch (e: any) {
      setError('Could not fetch live rates. Try again in a moment.');
      setRates(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRates(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  const rate = rates?.[to] ?? null;
  const converted = rate !== null ? num(amount) * rate : null;

  const rows: Row[] = [
    { label: 'Amount', value: amount || '0' },
    { label: 'From', value: from },
    { label: 'To', value: to },
    { label: 'Rate', value: rate !== null ? rate.toFixed(6) : 'unavailable' },
    { label: 'Converted amount', value: converted !== null ? converted.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'unavailable' },
    { label: 'Rate last updated (UTC)', value: updatedAt ?? 'unknown' },
  ];

  return (
    <ToolCard accentColor="#d6b141" title="Currency converter" description="Live rates, updated once daily by ExchangeRate-API." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount" value={amount} onChange={setAmount} />
        <Select label="From" value={from} onChange={setFrom} options={FX_CURRENCIES} />
        <Select label="To" value={to} onChange={setTo} options={FX_CURRENCIES} />
      </div>
      {error && <p className="mt-2 text-[12px] text-[var(--error-text)]">{error}</p>}
      <div className="mt-4">
        <ResultRow label="Rate" value={loading ? 'Loading...' : rate !== null ? `1 ${from} = ${rate.toFixed(4)} ${to}` : '\u2014'} />
        <ResultRow
          label="Converted amount"
          value={loading ? 'Loading...' : converted !== null ? converted.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '\u2014'}
          highlight
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--subtext)]">
        <span>{updatedAt ? `Updated ${updatedAt}` : ''}</span>
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">
          Rates by ExchangeRate-API
        </a>
      </div>
    </ToolCard>
  );
}

function TaxCalculatorTool({ defaultTaxRate }: { defaultTaxRate: number }) {
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate));

  const tax = num(amount) * (num(taxRate) / 100);
  const total = num(amount) + tax;

  const rows: Row[] = [
    { label: 'Amount', value: amount || '0' },
    { label: 'Tax rate %', value: taxRate || '0' },
    { label: 'Tax amount', value: tax.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Total with tax', value: total.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];

  return (
    <ToolCard accentColor="#d6d641" title="VAT / tax calculator" description="Defaults to your account's tax rate, adjustable per calculation." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" value={amount} onChange={setAmount} />
        <Field label="Tax rate" value={taxRate} onChange={setTaxRate} suffix="%" />
      </div>
      <div className="mt-4">
        <ResultRow label="Tax amount" value={tax.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Total with tax" value={total.toLocaleString(undefined, { maximumFractionDigits: 2 })} highlight />
      </div>
    </ToolCard>
  );
}

function ProfitMarginTool() {
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const profit = num(sellingPrice) - num(costPrice);
  const marginPct = num(sellingPrice) > 0 ? (profit / num(sellingPrice)) * 100 : 0;
  const markupPct = num(costPrice) > 0 ? (profit / num(costPrice)) * 100 : 0;

  const rows: Row[] = [
    { label: 'Cost price', value: costPrice || '0' },
    { label: 'Selling price', value: sellingPrice || '0' },
    { label: 'Profit', value: profit.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Margin %', value: `${marginPct.toFixed(1)}%` },
    { label: 'Markup %', value: `${markupPct.toFixed(1)}%` },
  ];

  return (
    <ToolCard accentColor="#b1d641" title="Profit margin calculator" description="Margin is profit as a percent of selling price. Markup is profit as a percent of cost." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost price" value={costPrice} onChange={setCostPrice} />
        <Field label="Selling price" value={sellingPrice} onChange={setSellingPrice} />
      </div>
      <div className="mt-4">
        <ResultRow label="Profit" value={profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Margin" value={`${marginPct.toFixed(1)}%`} />
        <ResultRow label="Markup" value={`${markupPct.toFixed(1)}%`} highlight />
      </div>
    </ToolCard>
  );
}

function ContainerUtilizationTool() {
  const [containerLength, setContainerLength] = useState('');
  const [containerWidth, setContainerWidth] = useState('');
  const [containerHeight, setContainerHeight] = useState('');
  const [cargoVolume, setCargoVolume] = useState('');

  const containerVolume = (num(containerLength) * num(containerWidth) * num(containerHeight)) / 1000000;
  const utilization = containerVolume > 0 ? (num(cargoVolume) / containerVolume) * 100 : 0;

  const rows: Row[] = [
    { label: 'Container length (cm)', value: containerLength || '0' },
    { label: 'Container width (cm)', value: containerWidth || '0' },
    { label: 'Container height (cm)', value: containerHeight || '0' },
    { label: 'Cargo volume (m3)', value: cargoVolume || '0' },
    { label: 'Container volume', value: `${containerVolume.toFixed(3)} m3` },
    { label: 'Utilization', value: `${utilization.toFixed(1)}%` },
  ];

  return (
    <ToolCard accentColor="#8cd641" title="Container utilization calculator" description="Container dimensions in cm, cargo volume in m\u00b3." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Container length" value={containerLength} onChange={setContainerLength} suffix="cm" />
        <Field label="Container width" value={containerWidth} onChange={setContainerWidth} suffix="cm" />
        <Field label="Container height" value={containerHeight} onChange={setContainerHeight} suffix="cm" />
      </div>
      <div className="mt-3">
        <Field label="Cargo volume" value={cargoVolume} onChange={setCargoVolume} suffix="m\u00b3" />
      </div>
      <div className="mt-4">
        <ResultRow label="Container volume" value={`${containerVolume.toFixed(3)} m\u00b3`} />
        <ResultRow label="Utilization" value={`${utilization.toFixed(1)}%`} highlight />
      </div>
    </ToolCard>
  );
}

function PalletCalculatorTool() {
  const [palletLength, setPalletLength] = useState('120');
  const [palletWidth, setPalletWidth] = useState('100');
  const [palletHeight, setPalletHeight] = useState('150');
  const [cartonLength, setCartonLength] = useState('');
  const [cartonWidth, setCartonWidth] = useState('');
  const [cartonHeight, setCartonHeight] = useState('');

  const perLayerLengthwise = num(cartonLength) > 0 ? Math.floor(num(palletLength) / num(cartonLength)) : 0;
  const perLayerWidthwise = num(cartonWidth) > 0 ? Math.floor(num(palletWidth) / num(cartonWidth)) : 0;
  const perLayer = perLayerLengthwise * perLayerWidthwise;
  const layers = num(cartonHeight) > 0 ? Math.floor(num(palletHeight) / num(cartonHeight)) : 0;
  const totalCartons = perLayer * layers;

  const rows: Row[] = [
    { label: 'Pallet L/W/max H (cm)', value: `${palletLength}/${palletWidth}/${palletHeight}` },
    { label: 'Carton L/W/H (cm)', value: `${cartonLength}/${cartonWidth}/${cartonHeight}` },
    { label: 'Cartons per layer', value: String(perLayer) },
    { label: 'Layers', value: String(layers) },
    { label: 'Total cartons per pallet', value: String(totalCartons) },
  ];

  return (
    <ToolCard accentColor="#66d641" title="Pallet calculator" description="How many cartons fit on a pallet. All dimensions in cm." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pallet length" value={palletLength} onChange={setPalletLength} suffix="cm" />
        <Field label="Pallet width" value={palletWidth} onChange={setPalletWidth} suffix="cm" />
        <Field label="Pallet max height" value={palletHeight} onChange={setPalletHeight} suffix="cm" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Field label="Carton length" value={cartonLength} onChange={setCartonLength} suffix="cm" />
        <Field label="Carton width" value={cartonWidth} onChange={setCartonWidth} suffix="cm" />
        <Field label="Carton height" value={cartonHeight} onChange={setCartonHeight} suffix="cm" />
      </div>
      <div className="mt-4">
        <ResultRow label="Cartons per layer" value={String(perLayer)} />
        <ResultRow label="Layers" value={String(layers)} />
        <ResultRow label="Total cartons per pallet" value={String(totalCartons)} highlight />
      </div>
    </ToolCard>
  );
}

function LandedCostTool() {
  const [productCost, setProductCost] = useState('');
  const [freight, setFreight] = useState('');
  const [duty, setDuty] = useState('');
  const [otherFees, setOtherFees] = useState('');
  const [units, setUnits] = useState('1');

  const total = num(productCost) + num(freight) + num(duty) + num(otherFees);
  const perUnit = num(units) > 0 ? total / num(units) : 0;

  const rows: Row[] = [
    { label: 'Product cost', value: productCost || '0' },
    { label: 'Freight', value: freight || '0' },
    { label: 'Customs duty', value: duty || '0' },
    { label: 'Other fees', value: otherFees || '0' },
    { label: 'Units', value: units || '0' },
    { label: 'Total landed cost', value: total.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Landed cost per unit', value: perUnit.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];

  return (
    <ToolCard accentColor="#41d641" title="Landed cost calculator" description="Total cost to get goods to your door, per unit." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Product cost" value={productCost} onChange={setProductCost} />
        <Field label="Freight" value={freight} onChange={setFreight} />
        <Field label="Customs duty" value={duty} onChange={setDuty} />
        <Field label="Other fees" value={otherFees} onChange={setOtherFees} />
        <Field label="Number of units" value={units} onChange={setUnits} />
      </div>
      <div className="mt-4">
        <ResultRow label="Total landed cost" value={total.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Landed cost per unit" value={perUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })} highlight />
      </div>
    </ToolCard>
  );
}

function CustomsDutyTool() {
  const [declaredValue, setDeclaredValue] = useState('');
  const [dutyRate, setDutyRate] = useState('');

  const duty = num(declaredValue) * (num(dutyRate) / 100);

  const rows: Row[] = [
    { label: 'Declared value', value: declaredValue || '0' },
    { label: 'Duty rate %', value: dutyRate || '0' },
    { label: 'Duty payable', value: duty.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];

  return (
    <ToolCard accentColor="#41d666" title="Customs duty calculator" description="Enter the duty rate for your goods' HS code, this tool does not look up rates for you." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Declared value" value={declaredValue} onChange={setDeclaredValue} />
        <Field label="Duty rate" value={dutyRate} onChange={setDutyRate} suffix="%" />
      </div>
      <div className="mt-4">
        <ResultRow label="Duty payable" value={duty.toLocaleString(undefined, { maximumFractionDigits: 2 })} highlight />
      </div>
    </ToolCard>
  );
}

function DeliveryCostTool() {
  const [distance, setDistance] = useState('');
  const [ratePerKm, setRatePerKm] = useState('');
  const [baseFee, setBaseFee] = useState('0');

  const total = num(distance) * num(ratePerKm) + num(baseFee);

  const rows: Row[] = [
    { label: 'Distance (km)', value: distance || '0' },
    { label: 'Rate per km', value: ratePerKm || '0' },
    { label: 'Base fee', value: baseFee || '0' },
    { label: 'Total delivery cost', value: total.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];

  return (
    <ToolCard accentColor="#41d68c" title="Delivery cost calculator" description="Distance-based delivery cost with a flat base fee." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Distance" value={distance} onChange={setDistance} suffix="km" />
        <Field label="Rate per km" value={ratePerKm} onChange={setRatePerKm} />
        <Field label="Base fee" value={baseFee} onChange={setBaseFee} />
      </div>
      <div className="mt-4">
        <ResultRow label="Total delivery cost" value={total.toLocaleString(undefined, { maximumFractionDigits: 2 })} highlight />
      </div>
    </ToolCard>
  );
}

function ShippingRateComparisonTool() {
  const [rows2, setRows2] = useState([
    { carrier: '', cost: '' },
    { carrier: '', cost: '' },
    { carrier: '', cost: '' },
  ]);

  function updateRow(i: number, field: 'carrier' | 'cost', value: string) {
    setRows2((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  const withCost = rows2.filter((r) => r.cost.trim() !== '');
  const cheapest = withCost.length
    ? withCost.reduce((a, b) => (num(a.cost) <= num(b.cost) ? a : b))
    : null;

  const rows: Row[] = [
    ...rows2.map((r, i) => ({ label: `Carrier ${i + 1}`, value: `${r.carrier || 'Unnamed'} — ${r.cost || '0'}` })),
    { label: 'Cheapest option', value: cheapest ? `${cheapest.carrier || 'Unnamed'} — ${num(cheapest.cost).toLocaleString()}` : '\u2014' },
  ];

  return (
    <ToolCard accentColor="#41d6b1" title="Shipping rate comparison" description="Enter quotes you've received manually, this tool doesn't fetch live carrier rates." rows={rows}>
      <div className="space-y-2">
        {rows2.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input
              placeholder={`Carrier ${i + 1}`}
              value={r.carrier}
              onChange={(e) => updateRow(i, 'carrier', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              type="number"
              placeholder="Quoted cost"
              value={r.cost}
              onChange={(e) => updateRow(i, 'cost', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ResultRow
          label="Cheapest option"
          value={cheapest ? `${cheapest.carrier || 'Unnamed'} — ${num(cheapest.cost).toLocaleString()}` : '\u2014'}
          highlight
        />
      </div>
    </ToolCard>
  );
}

function EtaCalculatorTool() {
  const [distance, setDistance] = useState('');
  const [avgSpeed, setAvgSpeed] = useState('');
  const [bufferDays, setBufferDays] = useState('0');

  const transitHours = num(avgSpeed) > 0 ? num(distance) / num(avgSpeed) : 0;
  const transitDays = transitHours / 24;
  const totalDays = transitDays + num(bufferDays);

  const rows: Row[] = [
    { label: 'Distance (km)', value: distance || '0' },
    { label: 'Avg speed (km/h)', value: avgSpeed || '0' },
    { label: 'Buffer (days)', value: bufferDays || '0' },
    { label: 'Transit time', value: `${transitHours.toFixed(1)} hrs (${transitDays.toFixed(1)} days)` },
    { label: 'Estimated total ETA', value: `${totalDays.toFixed(1)} days` },
  ];

  return (
    <ToolCard accentColor="#41d6d6" title="ETA calculator" description="Rough transit estimate from distance and average speed, plus a buffer for customs/handling delays." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Distance" value={distance} onChange={setDistance} suffix="km" />
        <Field label="Avg speed" value={avgSpeed} onChange={setAvgSpeed} suffix="km/h" />
        <Field label="Buffer" value={bufferDays} onChange={setBufferDays} suffix="days" />
      </div>
      <div className="mt-4">
        <ResultRow label="Transit time" value={`${transitHours.toFixed(1)} hrs (${transitDays.toFixed(1)} days)`} />
        <ResultRow label="Estimated total ETA" value={`${totalDays.toFixed(1)} days`} highlight />
      </div>
    </ToolCard>
  );
}

function ShipmentProfitabilityTool() {
  const [revenue, setRevenue] = useState('');
  const [freightCost, setFreightCost] = useState('');
  const [customsCost, setCustomsCost] = useState('');
  const [handlingCost, setHandlingCost] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('');
  const [otherCosts, setOtherCosts] = useState('0');

  const totalCost = num(freightCost) + num(customsCost) + num(handlingCost) + num(deliveryCost) + num(otherCosts);
  const grossProfit = num(revenue) - totalCost;
  const marginPct = num(revenue) > 0 ? (grossProfit / num(revenue)) * 100 : 0;

  const rows: Row[] = [
    { label: 'Customer revenue', value: revenue || '0' },
    { label: 'Freight cost', value: freightCost || '0' },
    { label: 'Customs cost', value: customsCost || '0' },
    { label: 'Handling cost', value: handlingCost || '0' },
    { label: 'Delivery cost', value: deliveryCost || '0' },
    { label: 'Other costs', value: otherCosts || '0' },
    { label: 'Total cost', value: totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Gross profit', value: grossProfit.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: 'Margin %', value: `${marginPct.toFixed(1)}%` },
  ];

  return (
    <ToolCard accentColor="#41b1d6" title="Shipment profitability" description="Revenue minus every cost tied to this shipment." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer revenue" value={revenue} onChange={setRevenue} />
        <Field label="Freight cost" value={freightCost} onChange={setFreightCost} />
        <Field label="Customs cost" value={customsCost} onChange={setCustomsCost} />
        <Field label="Handling cost" value={handlingCost} onChange={setHandlingCost} />
        <Field label="Delivery cost" value={deliveryCost} onChange={setDeliveryCost} />
        <Field label="Other costs" value={otherCosts} onChange={setOtherCosts} />
      </div>
      <div className="mt-4">
        <ResultRow label="Total cost" value={totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Gross profit" value={grossProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <ResultRow label="Margin" value={`${marginPct.toFixed(1)}%`} highlight />
      </div>
    </ToolCard>
  );
}

function ReorderPointTool() {
  const [avgDailyUsage, setAvgDailyUsage] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [safetyStock, setSafetyStock] = useState('0');

  const reorderPoint = num(avgDailyUsage) * num(leadTimeDays) + num(safetyStock);

  const rows: Row[] = [
    { label: 'Avg daily usage', value: avgDailyUsage || '0' },
    { label: 'Lead time (days)', value: leadTimeDays || '0' },
    { label: 'Safety stock', value: safetyStock || '0' },
    { label: 'Reorder point', value: `${reorderPoint.toFixed(0)} units` },
  ];

  return (
    <ToolCard accentColor="#418cd6" title="Reorder point calculator" description="When stock hits this number, reorder." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Avg daily usage" value={avgDailyUsage} onChange={setAvgDailyUsage} suffix="units" />
        <Field label="Lead time" value={leadTimeDays} onChange={setLeadTimeDays} suffix="days" />
        <Field label="Safety stock" value={safetyStock} onChange={setSafetyStock} suffix="units" />
      </div>
      <div className="mt-4">
        <ResultRow label="Reorder point" value={`${reorderPoint.toFixed(0)} units`} highlight />
      </div>
    </ToolCard>
  );
}

function WarehouseCapacityTool() {
  const [warehouseVolume, setWarehouseVolume] = useState('');
  const [usedVolume, setUsedVolume] = useState('');

  const utilization = num(warehouseVolume) > 0 ? (num(usedVolume) / num(warehouseVolume)) * 100 : 0;
  const remaining = num(warehouseVolume) - num(usedVolume);

  const rows: Row[] = [
    { label: 'Warehouse volume (m3)', value: warehouseVolume || '0' },
    { label: 'Used volume (m3)', value: usedVolume || '0' },
    { label: 'Remaining capacity', value: `${remaining.toFixed(2)} m3` },
    { label: 'Utilization', value: `${utilization.toFixed(1)}%` },
  ];

  return (
    <ToolCard accentColor="#4166d6" title="Warehouse capacity calculator" description="Volumes in m\u00b3." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Warehouse volume" value={warehouseVolume} onChange={setWarehouseVolume} suffix="m\u00b3" />
        <Field label="Used volume" value={usedVolume} onChange={setUsedVolume} suffix="m\u00b3" />
      </div>
      <div className="mt-4">
        <ResultRow label="Remaining capacity" value={`${remaining.toFixed(2)} m\u00b3`} />
        <ResultRow label="Utilization" value={`${utilization.toFixed(1)}%`} highlight />
      </div>
    </ToolCard>
  );
}

function SkuGeneratorTool() {
  const [prefix, setPrefix] = useState('SKU');
  const [category, setCategory] = useState('');
  const [count, setCount] = useState('5');
  const [generated, setGenerated] = useState<string[]>([]);

  function generate() {
    const n = Math.max(1, Math.min(50, Math.round(num(count)) || 1));
    const catCode = category.trim() ? category.trim().slice(0, 3).toUpperCase() : '';
    const list: string[] = [];
    for (let i = 0; i < n; i++) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      list.push([prefix.trim() || 'SKU', catCode, rand].filter(Boolean).join('-'));
    }
    setGenerated(list);
  }

  const rows: Row[] = generated.length
    ? generated.map((s, i) => ({ label: `SKU ${i + 1}`, value: s }))
    : [{ label: 'Generated SKUs', value: 'none yet' }];

  return (
    <ToolCard accentColor="#4141d6" title="SKU generator" description="Generates random SKU codes from a prefix and category. Check for duplicates against your inventory before use." rows={rows}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Prefix" value={prefix} onChange={setPrefix} type="text" />
        <Field label="Category code" value={category} onChange={setCategory} type="text" />
        <Field label="How many" value={count} onChange={setCount} />
      </div>
      <button
        onClick={generate}
        className="mt-3 rounded-sm bg-[#e5231b] px-4 py-2 text-[12px] font-bold text-white"
      >
        Generate
      </button>
      {generated.length > 0 && (
        <div className="mt-4 space-y-1">
          {generated.map((s, i) => (
            <div key={i} className="rounded-sm bg-[var(--input-bg)] px-3 py-1.5 font-mono text-[13px] text-[var(--text)]">
              {s}
            </div>
          ))}
        </div>
      )}
    </ToolCard>
  );
}

function ShipmentReferenceGeneratorTool() {
  const [prefix, setPrefix] = useState('JAAD');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');

  function generate() {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setReference(`${prefix.trim() || 'JAAD'}/${dd}${mm}/${yyyy}/${rand}`);
  }

  const rows: Row[] = [
    { label: 'Prefix', value: prefix },
    { label: 'Date', value: date },
    { label: 'Generated reference', value: reference || 'none yet' },
  ];

  return (
    <ToolCard accentColor="#6641d6" title="Shipment reference generator" description="Generates a reference number, doesn't check for collisions against your real bookings." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prefix" value={prefix} onChange={setPrefix} type="text" />
        <Field label="Date" value={date} onChange={setDate} type="date" />
      </div>
      <button
        onClick={generate}
        className="mt-3 rounded-sm bg-[#e5231b] px-4 py-2 text-[12px] font-bold text-white"
      >
        Generate
      </button>
      {reference && (
        <div className="mt-4 rounded-sm bg-[var(--input-bg)] px-3 py-2 font-mono text-sm text-[var(--text)]">
          {reference}
        </div>
      )}
    </ToolCard>
  );
}

function DelayCalculatorTool() {
  const [expectedDate, setExpectedDate] = useState('');
  const [actualDate, setActualDate] = useState('');

  const expected = expectedDate ? new Date(expectedDate) : null;
  const actual = actualDate ? new Date(actualDate) : null;
  const delayDays = expected && actual ? Math.round((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const rows: Row[] = [
    { label: 'Expected date', value: expectedDate || 'not set' },
    { label: 'Actual date', value: actualDate || 'not set' },
    { label: 'Delay', value: delayDays !== null ? `${delayDays} day(s)` : 'unavailable' },
  ];

  return (
    <ToolCard accentColor="#8c41d6" title="Delay calculator" description="Positive days means late, negative means early." rows={rows}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected date" value={expectedDate} onChange={setExpectedDate} type="date" />
        <Field label="Actual date" value={actualDate} onChange={setActualDate} type="date" />
      </div>
      <div className="mt-4">
        <ResultRow
          label={delayDays !== null && delayDays > 0 ? 'Days late' : delayDays !== null && delayDays < 0 ? 'Days early' : 'Delay'}
          value={delayDays !== null ? `${Math.abs(delayDays)} day(s)` : '\u2014'}
          highlight
        />
      </div>
    </ToolCard>
  );
}

function PackingListTool() {
  const [items, setItems] = useState([{ description: '', qty: '', weight: '' }]);

  function updateItem(i: number, field: 'description' | 'qty' | 'weight', value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  const totalQty = items.reduce((sum, it) => sum + num(it.qty), 0);
  const totalWeight = items.reduce((sum, it) => sum + num(it.weight), 0);

  const rows: Row[] = [
    ...items.map((it, i) => ({ label: it.description || `Item ${i + 1}`, value: `Qty ${it.qty || 0}, ${it.weight || 0} kg` })),
    { label: 'Total quantity', value: String(totalQty) },
    { label: 'Total weight', value: `${totalWeight} kg` },
  ];

  return (
    <ToolCard accentColor="#b141d6" title="Packing list generator" description="Build a packing list, then print or download it." rows={rows}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_70px_80px] gap-2">
            <input
              placeholder="Description"
              value={it.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              type="number"
              placeholder="Qty"
              value={it.qty}
              onChange={(e) => updateItem(i, 'qty', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              type="number"
              placeholder="kg"
              value={it.weight}
              onChange={(e) => updateItem(i, 'weight', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => setItems((prev) => [...prev, { description: '', qty: '', weight: '' }])}
        className="mt-2 text-[12px] font-semibold text-[#e5231b] hover:underline"
      >
        + Add item
      </button>
      <div className="mt-4">
        <ResultRow label="Total quantity" value={String(totalQty)} />
        <ResultRow label="Total weight" value={`${totalWeight} kg`} highlight />
      </div>
    </ToolCard>
  );
}

function PickListTool() {
  const [items, setItems] = useState([{ sku: '', description: '', qty: '', location: '' }]);

  function updateItem(i: number, field: 'sku' | 'description' | 'qty' | 'location', value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  const rows: Row[] = items.map((it, i) => ({
    label: it.sku || `Item ${i + 1}`,
    value: `${it.description || ''} | Qty ${it.qty || 0} | ${it.location || 'no location'}`,
  }));

  return (
    <ToolCard accentColor="#d641d6" title="Pick list generator" description="Build a warehouse pick list, then print or download it." rows={rows}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            <input
              placeholder="SKU"
              value={it.sku}
              onChange={(e) => updateItem(i, 'sku', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              placeholder="Description"
              value={it.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              type="number"
              placeholder="Qty"
              value={it.qty}
              onChange={(e) => updateItem(i, 'qty', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
            <input
              placeholder="Location"
              value={it.location}
              onChange={(e) => updateItem(i, 'location', e.target.value)}
              className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[13px] text-[var(--text)] outline-none focus:border-[#e5231b]"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => setItems((prev) => [...prev, { sku: '', description: '', qty: '', location: '' }])}
        className="mt-2 text-[12px] font-semibold text-[#e5231b] hover:underline"
      >
        + Add item
      </button>
    </ToolCard>
  );
}

function SafetyStockTool() {
  const supabase = createClient();
  const [items, setItems] = useState<{ sku: string | null; item_name: string; quantity: number; reorder_threshold: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState('');
  const [avgDailyUsage, setAvgDailyUsage] = useState('');
  const [maxDailyUsage, setMaxDailyUsage] = useState('');
  const [avgLeadTime, setAvgLeadTime] = useState('');
  const [maxLeadTime, setMaxLeadTime] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('customer_inventory')
        .select('sku, item_name, quantity, reorder_threshold')
        .order('item_name', { ascending: true });
      setItems(data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = items.find((it) => it.item_name === selectedName) ?? null;

  // Safety stock = (Max daily usage x Max lead time) - (Avg daily usage x Avg lead time)
  const safetyStock = num(maxDailyUsage) * num(maxLeadTime) - num(avgDailyUsage) * num(avgLeadTime);

  const rows: Row[] = [
    { label: 'Selected item', value: selected ? `${selected.item_name} (${selected.sku ?? 'no SKU'})` : 'none' },
    { label: 'Current quantity on hand', value: selected ? String(selected.quantity) : 'n/a' },
    { label: 'Current reorder threshold', value: selected ? String(selected.reorder_threshold) : 'n/a' },
    { label: 'Avg daily usage', value: avgDailyUsage || '0' },
    { label: 'Max daily usage', value: maxDailyUsage || '0' },
    { label: 'Avg lead time (days)', value: avgLeadTime || '0' },
    { label: 'Max lead time (days)', value: maxLeadTime || '0' },
    { label: 'Recommended safety stock', value: `${Math.max(0, safetyStock).toFixed(0)} units` },
  ];

  return (
    <ToolCard
      accentColor="#d641b1"
      title="Safety stock calculator"
      description="Pulls current quantity and reorder threshold from your live inventory. Usage and lead time figures are entered manually since they aren't tracked yet."
      rows={rows}
    >
      {loading ? (
        <p className="text-sm text-[var(--subtext)]">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--subtext)]">No inventory items on file yet.</p>
      ) : (
        <>
          <Select
            label="Inventory item"
            value={selectedName}
            onChange={setSelectedName}
            options={['', ...items.map((it) => it.item_name)]}
          />
          {selected && (
            <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--input-bg)] p-3 text-[12px] text-[var(--subtext)]">
              Current on hand: <span className="font-semibold text-[var(--text)]">{selected.quantity}</span>
              {' '}&middot; Current reorder threshold: <span className="font-semibold text-[var(--text)]">{selected.reorder_threshold}</span>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Avg daily usage" value={avgDailyUsage} onChange={setAvgDailyUsage} suffix="units" />
            <Field label="Max daily usage" value={maxDailyUsage} onChange={setMaxDailyUsage} suffix="units" />
            <Field label="Avg lead time" value={avgLeadTime} onChange={setAvgLeadTime} suffix="days" />
            <Field label="Max lead time" value={maxLeadTime} onChange={setMaxLeadTime} suffix="days" />
          </div>
          <div className="mt-4">
            <ResultRow label="Recommended safety stock" value={`${Math.max(0, safetyStock).toFixed(0)} units`} highlight />
          </div>
        </>
      )}
    </ToolCard>
  );
}

function QrCodeGeneratorTool() {
  const [text, setText] = useState('');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!text.trim()) {
      setError('Enter a SKU, reference, or URL to encode.');
      return;
    }
    setError(null);
    try {
      const url = await QRCode.toDataURL(text.trim(), { width: 300, margin: 2 });
      setDataUrl(url);
    } catch {
      setError('Could not generate QR code.');
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${text.trim().slice(0, 20).replace(/[^a-z0-9]+/gi, '-') || 'code'}.png`;
    a.click();
  }

  function printQr() {
    if (!dataUrl) return;
    const win = window.open('', '_blank', 'width=420,height=520');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR code</title></head>
        <body style="font-family:Arial,Helvetica,sans-serif;text-align:center;padding:24px;">
          <img src="${dataUrl}" style="width:280px;height:280px;" />
          <p style="font-size:12px;color:#555;word-break:break-all;">${text}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5" style={{ borderLeft: '4px solid #d6418c' }}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold text-[var(--text)]">QR code generator</h4>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={printQr}
            disabled={!dataUrl}
            className="rounded-sm border border-[var(--input-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)] disabled:opacity-40"
          >
            Print
          </button>
          <button
            onClick={downloadPng}
            disabled={!dataUrl}
            className="rounded-sm border border-[var(--input-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)] disabled:opacity-40"
          >
            Download
          </button>
        </div>
      </div>
      <p className="mb-4 text-[12px] text-[var(--subtext)]">
        Encode a SKU, tracking reference, or URL. For linear barcodes (Code128/EAN), a different library is needed, ask if you want that added.
      </p>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. JAAD/0509/2026/1234"
          className="flex-1 rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
        />
        <button onClick={generate} className="rounded-sm bg-[#e5231b] px-4 py-2 text-[12px] font-bold text-white">
          Generate
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-[var(--error-text)]">{error}</p>}
      {dataUrl && (
        <div className="mt-4 flex justify-center">
          <img src={dataUrl} alt="QR code" className="h-48 w-48" />
        </div>
      )}
    </div>
  );
}

function BarcodeGeneratorTool() {
  const [text, setText] = useState('');
  const [format, setFormat] = useState('CODE128');
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  function generate() {
    if (!text.trim()) {
      setError('Enter a value to encode.');
      setRendered(false);
      return;
    }
    setError(null);
    try {
      if (svgRef.current) {
        JsBarcode(svgRef.current, text.trim(), { format, displayValue: true, width: 2, height: 80 });
        setRendered(true);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not generate barcode. Check the value matches the selected format (e.g. EAN-13 needs 12-13 digits).');
      setRendered(false);
    }
  }

  function downloadPng() {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 400;
      canvas.height = img.height || 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `barcode-${text.trim().slice(0, 20).replace(/[^a-z0-9]+/gi, '-') || 'code'}.png`;
      a.click();
    };
    img.src = url;
  }

  function printBarcode() {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const win = window.open('', '_blank', 'width=480,height=320');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Barcode</title></head>
        <body style="font-family:Arial,Helvetica,sans-serif;text-align:center;padding:24px;">
          ${svgData}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5" style={{ borderLeft: '4px solid #d64166' }}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold text-[var(--text)]">Barcode generator</h4>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={printBarcode}
            disabled={!rendered}
            className="rounded-sm border border-[var(--input-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)] disabled:opacity-40"
          >
            Print
          </button>
          <button
            onClick={downloadPng}
            disabled={!rendered}
            className="rounded-sm border border-[var(--input-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--subtext)] hover:bg-[var(--input-bg)] disabled:opacity-40"
          >
            Download
          </button>
        </div>
      </div>
      <p className="mb-4 text-[12px] text-[var(--subtext)]">
        Linear barcode (CODE128, EAN-13, EAN-8, UPC, CODE39, ITF-14, Codabar).
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 123456789012"
          className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
        />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
        >
          {['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39', 'ITF14', 'codabar'].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <button onClick={generate} className="mt-3 rounded-sm bg-[#e5231b] px-4 py-2 text-[12px] font-bold text-white">
        Generate
      </button>
      {error && <p className="mt-2 text-[12px] text-[var(--error-text)]">{error}</p>}
      <div className="mt-4 flex justify-center rounded-md bg-white p-3">
        <svg ref={svgRef} />
      </div>
    </div>
  );
}

export default function UtilitiesTab({ defaultTaxRate = 7.5 }: { defaultTaxRate?: number }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold text-[var(--text)]">Utilities</h3>
        <p className="text-[13px] text-[var(--subtext)]">
          Logistics, warehouse and finance calculators. Every tool can be printed or downloaded.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChargeableWeightTool />
        <CbmTool />
        <FreightCostTool />
        <CurrencyConverterTool />
        <TaxCalculatorTool defaultTaxRate={defaultTaxRate} />
        <ProfitMarginTool />
        <ContainerUtilizationTool />
        <PalletCalculatorTool />
        <LandedCostTool />
        <CustomsDutyTool />
        <DeliveryCostTool />
        <ShippingRateComparisonTool />
        <EtaCalculatorTool />
        <ShipmentProfitabilityTool />
        <ReorderPointTool />
        <SafetyStockTool />
        <WarehouseCapacityTool />
        <SkuGeneratorTool />
        <ShipmentReferenceGeneratorTool />
        <DelayCalculatorTool />
        <PackingListTool />
        <PickListTool />
        <QrCodeGeneratorTool />
        <BarcodeGeneratorTool />
      </div>
    </div>
  );
}
