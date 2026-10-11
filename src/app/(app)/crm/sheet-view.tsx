'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  createSheetTab,
  deleteSheetTab,
  getSheetCells,
  getSheetTabs,
  renameSheetTab,
  updateSheetCell,
  updateSheetCellStyle,
  updateSheetLayout,
} from './sheet-actions';

const COLS = 26;
const INITIAL_ROWS = 50;
const DEFAULT_COL_WIDTH = 110;
const DEFAULT_ROW_HEIGHT = 28;

type Tab = {
  id: string;
  name: string;
  position: number;
  created_at: string;
  column_widths?: Record<string, number> | null;
  row_heights?: Record<string, number> | null;
};
type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
};
type Cell = { row_index: number; col_index: number; value: string | null; style?: CellStyle | null };

function colLabel(index: number) {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}
function cellKey(row: number, col: number) { return `${row}-${col}`; }
function refToKey(ref: string) {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return `${Number(m[2]) - 1}-${col - 1}`;
}
function rawValue(cells: Record<string, string>, ref: string, seen: Set<string>): number {
  const key = refToKey(ref);
  if (!key || seen.has(key)) return 0;
  const raw = cells[key] ?? '';
  if (!raw.startsWith('=')) {
    const n = Number(raw.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return evaluateFormula(raw, cells, new Set([...seen, key]));
}
function evaluateFormula(raw: string, cells: Record<string, string>, seen = new Set<string>()) {
  let expr = raw.trim().slice(1).toUpperCase();
  expr = expr.replace(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_m, start, end) => {
    const s = refToKey(start); const e = refToKey(end);
    if (!s || !e) return '0';
    const [sr, sc] = s.split('-').map(Number); const [er, ec] = e.split('-').map(Number);
    let total = 0;
    for (let r = Math.min(sr, er); r <= Math.max(sr, er); r++) for (let c = Math.min(sc, ec); c <= Math.max(sc, ec); c++) total += rawValue(cells, colLabel(c) + (r + 1), seen);
    return String(total);
  });
  expr = expr.replace(/([A-Z]+\d+)/g, (ref) => String(rawValue(cells, ref, seen)));
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return '#VALUE!';
  try {
    const result = Function(`"use strict"; return (${expr})`)();
    return Number.isFinite(Number(result)) ? Number(result) : '#VALUE!';
  } catch { return '#VALUE!'; }
}
function displayValue(raw: string, cells: Record<string, string>) {
  if (!raw.startsWith('=')) return raw;
  const result = evaluateFormula(raw, cells);
  return typeof result === 'number' ? String(result) : result;
}

export default function SheetView() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<Record<string, CellStyle>>({});
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [anchor, setAnchor] = useState({ row: 0, col: 0 });
  const [formulaInput, setFormulaInput] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(11);
  const [textColor, setTextColor] = useState('#111827');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [align, setAlign] = useState<CellStyle['textAlign']>('left');
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [tabPending, startTabTransition] = useTransition();
  const [dragging, setDragging] = useState<{ type: 'col' | 'row'; index: number; start: number; size: number } | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dirtyValues = useRef<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSheetTabs().then((res) => {
      if (res.tabs?.length) {
        const loaded = res.tabs as Tab[];
        setTabs(loaded);
        setActiveTab(loaded[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    setCells({}); setStyles({}); setLoading(true);
    const tab = tabs.find((t) => t.id === activeTab);
    const widths: Record<number, number> = {};
    const heights: Record<number, number> = {};
    Object.entries(tab?.column_widths ?? {}).forEach(([k, v]) => { widths[Number(k)] = Number(v); });
    Object.entries(tab?.row_heights ?? {}).forEach(([k, v]) => { heights[Number(k)] = Number(v); });
    setColWidths(widths); setRowHeights(heights);
    getSheetCells(activeTab).then((res) => {
      const valueMap: Record<string, string> = {}; const styleMap: Record<string, CellStyle> = {};
      (res.cells ?? []).forEach((c: Cell) => {
        const key = cellKey(c.row_index, c.col_index);
        valueMap[key] = c.value ?? '';
        if (c.style) styleMap[key] = c.style;
      });
      setCells(valueMap); setStyles(styleMap); setLoading(false);
    });
  }, [activeTab, tabs]);

  useEffect(() => {
    const key = cellKey(selected.row, selected.col); const style = styles[key]; const raw = cells[key] ?? '';
    setFormulaInput(raw); setFontFamily(style?.fontFamily ?? 'Arial'); setFontSize(Number(style?.fontSize ?? 11));
    setTextColor(style?.color ?? '#111827'); setFillColor(style?.backgroundColor ?? '#ffffff'); setAlign(style?.textAlign ?? 'left');
  }, [selected, cells, styles]);

  function saveValue(row: number, col: number, value: string) {
    if (!activeTab) return;
    const key = cellKey(row, col); setCells((prev) => ({ ...prev, [key]: value }));
    dirtyValues.current.add(key);
    const timerKey = `v-${key}`; if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
    saveTimers.current[timerKey] = setTimeout(() => updateSheetCell(activeTab, row, col, value), 300);
  }
  function selectCell(row: number, col: number, extend = false) {
    if (extend) setSelected({ row, col }); else { setAnchor({ row, col }); setSelected({ row, col }); }
  }
  function selectedRange() {
    return {
      r1: Math.min(anchor.row, selected.row), r2: Math.max(anchor.row, selected.row),
      c1: Math.min(anchor.col, selected.col), c2: Math.max(anchor.col, selected.col),
    };
  }
  function eachSelected(fn: (row: number, col: number) => void) {
    const { r1, r2, c1, c2 } = selectedRange();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) fn(r, c);
  }
  function applyStyle(patch: CellStyle) {
    if (!activeTab) return;
    eachSelected((row, col) => {
      const key = cellKey(row, col); const next = { ...(styles[key] ?? {}), ...patch };
      setStyles((prev) => ({ ...prev, [key]: next })); updateSheetCellStyle(activeTab, row, col, next);
    });
  }
  function commitFormula() { saveValue(selected.row, selected.col, formulaInput); }

  async function saveSheet() {
    if (!activeTab || saving) return;
    setSaving(true);
    try {
      const pendingKeys = Array.from(dirtyValues.current);
      await Promise.all(pendingKeys.map((key) => {
        const [row, col] = key.split('-').map(Number);
        return updateSheetCell(activeTab, row, col, cells[key] ?? '');
      }));
      await updateSheetLayout(
        activeTab,
        Object.fromEntries(Object.entries(colWidths).map(([k, v]) => [k, Math.round(v)])),
        Object.fromEntries(Object.entries(rowHeights).map(([k, v]) => [k, Math.round(v)])),
      );
      dirtyValues.current.clear();
    } finally {
      setSaving(false);
    }
  }

  function addTab() {
    startTabTransition(async () => {
      const res = await createSheetTab();
      if (res.error || !res.tab) return window.alert(res.error || 'Could not create sheet.');
      setTabs((prev) => [...prev, res.tab as Tab]); setActiveTab(res.tab.id);
    });
  }
  function renameTab(tab: Tab) {
    const nextName = window.prompt('Rename sheet', tab.name)?.trim(); if (!nextName || nextName === tab.name) return;
    startTabTransition(async () => {
      const res = await renameSheetTab(tab.id, nextName); if (res.error) return window.alert(res.error);
      setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, name: nextName } : t));
    });
  }
  function deleteTab(tab: Tab) {
    if (tabs.length <= 1) return window.alert('Excel sheets must have at least one sheet. Create another sheet before deleting this one.');
    if (!window.confirm(`Delete “${tab.name}”? This will permanently delete the sheet and its cells.`)) return;
    startTabTransition(async () => {
      const res = await deleteSheetTab(tab.id); if (res.error) return window.alert(res.error);
      const remaining = tabs.filter((t) => t.id !== tab.id); setTabs(remaining);
      if (activeTab === tab.id) setActiveTab(remaining[0]?.id ?? null);
    });
  }
  function saveLayout(nextWidths = colWidths, nextHeights = rowHeights) {
    if (!activeTab) return;
    updateSheetLayout(activeTab, Object.fromEntries(Object.entries(nextWidths).map(([k, v]) => [k, Math.round(v)])), Object.fromEntries(Object.entries(nextHeights).map(([k, v]) => [k, Math.round(v)])));
  }
  function startResize(type: 'col' | 'row', index: number, e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    const size = type === 'col' ? (colWidths[index] ?? DEFAULT_COL_WIDTH) : (rowHeights[index] ?? DEFAULT_ROW_HEIGHT);
    setDragging({ type, index, start: type === 'col' ? e.clientX : e.clientY, size });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function moveResize(e: React.PointerEvent) {
    if (!dragging) return;
    const delta = (dragging.type === 'col' ? e.clientX : e.clientY) - dragging.start;
    const next = Math.max(36, Math.min(500, dragging.size + delta));
    if (dragging.type === 'col') setColWidths((prev) => ({ ...prev, [dragging.index]: next }));
    else setRowHeights((prev) => ({ ...prev, [dragging.index]: next }));
  }
  function finishResize() {
    if (!dragging) return;
    if (dragging.type === 'col') { const next = { ...colWidths, [dragging.index]: Math.max(36, Math.min(500, colWidths[dragging.index] ?? DEFAULT_COL_WIDTH)) }; setColWidths(next); saveLayout(next, rowHeights); }
    else { const next = { ...rowHeights, [dragging.index]: Math.max(22, Math.min(180, rowHeights[dragging.index] ?? DEFAULT_ROW_HEIGHT)) }; setRowHeights(next); saveLayout(colWidths, next); }
    setDragging(null);
  }
  function addRows() { setRows((r) => r + 20); }

  const selectedKey = cellKey(selected.row, selected.col); const selectedRaw = cells[selectedKey] ?? ''; const selectedStyle = styles[selectedKey] ?? {};
  const selectedDisplay = displayValue(selectedRaw, cells); const cellAddress = `${colLabel(selected.col)}${selected.row + 1}`;
  const range = selectedRange();
  const toolbarButton = 'rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200';

  if (loading && !activeTab) return <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">Loading sheet...</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={toolbarButton} onClick={() => applyStyle({ bold: !selectedStyle.bold })}>B</button>
          <button type="button" className={`${toolbarButton} italic`} onClick={() => applyStyle({ italic: !selectedStyle.italic })}>I</button>
          <button type="button" className={`${toolbarButton} underline`} onClick={() => applyStyle({ underline: !selectedStyle.underline })}>U</button>
          <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); applyStyle({ fontFamily: e.target.value }); }} className="h-7 rounded border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
            {['Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'].map((f) => <option key={f}>{f}</option>)}
          </select>
          <select value={fontSize} onChange={(e) => { const n = Number(e.target.value); setFontSize(n); applyStyle({ fontSize: n }); }} className="h-7 w-16 rounded border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
            {[8,9,10,11,12,14,16,18,20,24,28,32,36].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="flex h-7 items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900">A<input aria-label="Text color" type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); applyStyle({ color: e.target.value }); }} className="h-5 w-5 cursor-pointer border-0 p-0" /></label>
          <label className="flex h-7 items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 text-[10px] dark:border-neutral-700 dark:bg-neutral-900">Fill<input aria-label="Cell fill color" type="color" value={fillColor} onChange={(e) => { setFillColor(e.target.value); applyStyle({ backgroundColor: e.target.value }); }} className="h-5 w-5 cursor-pointer border-0 p-0" /></label>
          <select value={align} onChange={(e) => { const v = e.target.value as CellStyle['textAlign']; setAlign(v); applyStyle({ textAlign: v }); }} className="h-7 rounded border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
          <span className="mx-1 h-5 w-px bg-neutral-300" />
          <button type="button" className={toolbarButton} onClick={() => applyStyle({ fontFamily: 'Arial', fontSize: 11, bold: false, italic: false, underline: false, color: '#111827', backgroundColor: '#ffffff', textAlign: 'left' })}>Clear format</button>
          <button type="button" onClick={saveSheet} disabled={saving} className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save sheet'}</button>
          <span className="text-[10px] text-neutral-500">Drag column/row borders to resize</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-16 rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{cellAddress}</div>
          <span className="text-sm font-semibold text-neutral-400">fx</span>
          <input value={formulaInput} onChange={(e) => setFormulaInput(e.target.value)} onBlur={commitFormula} onKeyDown={(e) => { if (e.key === 'Enter') { commitFormula(); (e.currentTarget as HTMLInputElement).blur(); } }} placeholder="Enter text or formula, e.g. =SUM(A1:A5)" className="h-8 min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 text-xs outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-900" />
          <div className="hidden max-w-[180px] truncate text-xs text-neutral-500 xl:block">{selectedDisplay}</div>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '62vh' }} onPointerMove={moveResize} onPointerUp={finishResize} onPointerCancel={finishResize}>
        <table className="border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 42 }} />
            {Array.from({ length: COLS }).map((_, c) => <col key={c} style={{ width: colWidths[c] ?? DEFAULT_COL_WIDTH }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-40 w-10 border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">●</th>
              {Array.from({ length: COLS }).map((_, c) => (
                <th key={c} className="group sticky top-0 z-30 border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300" style={{ width: colWidths[c] ?? DEFAULT_COL_WIDTH }} onClick={() => selectCell(0, c)}>
                  {colLabel(c)}
                  <span className="float-right inline-block h-5 w-1 cursor-col-resize rounded opacity-0 group-hover:bg-red-500 group-hover:opacity-70" onPointerDown={(e) => startResize('col', c, e)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} style={{ height: rowHeights[r] ?? DEFAULT_ROW_HEIGHT }}>
                <td className="group relative sticky left-0 z-20 border border-neutral-200 bg-neutral-100 px-2 py-1 text-center text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400" style={{ height: rowHeights[r] ?? DEFAULT_ROW_HEIGHT }} onClick={() => selectCell(r, 0)}>
                  {r + 1}<span className="absolute bottom-0 left-0 right-0 mx-auto block h-1 cursor-row-resize opacity-0 group-hover:bg-red-500 group-hover:opacity-70" onPointerDown={(e) => startResize('row', r, e)} />
                </td>
                {Array.from({ length: COLS }).map((_, c) => {
                  const key = cellKey(r, c); const style = styles[key] ?? {};
                  const isSelected = r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
                  return (
                    <td key={c} className={`border border-neutral-200 p-0 dark:border-neutral-800 ${isSelected ? 'ring-2 ring-inset ring-red-500' : ''}`} style={{ height: rowHeights[r] ?? DEFAULT_ROW_HEIGHT }} onClick={(e) => selectCell(r, c, e.shiftKey)}>
                      <input value={displayValue(cells[key] ?? '', cells)} onFocus={() => setSelected({ row: r, col: c })} onChange={(e) => saveValue(r, c, e.target.value)} className="h-full w-full min-w-0 border-0 px-2 outline-none" style={{ fontFamily: style.fontFamily ?? 'Arial', fontSize: `${style.fontSize ?? 11}px`, fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? 'italic' : 'normal', textDecoration: style.underline ? 'underline' : 'none', color: style.color ?? '#111827', backgroundColor: style.backgroundColor ?? '#ffffff', textAlign: style.textAlign ?? 'left' }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1 border-t border-neutral-300 bg-neutral-100 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} onDoubleClick={() => renameTab(tab)} disabled={tabPending} className={`whitespace-nowrap rounded-t-md border border-b-0 px-4 py-2 text-xs font-semibold ${activeTab === tab.id ? 'border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800'}`} title="Double-click to rename">{tab.name}</button>
          ))}
          <button type="button" onClick={addTab} disabled={tabPending} className="rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-200 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200" title="Add new sheet">＋</button>
        </div>
        {activeTab && tabs.find((t) => t.id === activeTab) && <button type="button" onClick={() => deleteTab(tabs.find((t) => t.id === activeTab)!)} disabled={tabPending || tabs.length <= 1} className="rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" title="Delete active sheet">Delete sheet</button>}
        <button type="button" onClick={addRows} className="rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">+ Rows</button>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-3 py-1 text-[10px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
        <span>Changes save automatically.</span><span>Shift-click selects a range • Double-click a sheet tab to rename • Drag headers to resize.</span>
      </div>
    </div>
  );
}
