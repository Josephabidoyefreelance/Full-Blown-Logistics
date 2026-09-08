'use client';

import { useEffect, useRef, useState } from 'react';
import { getSheetCells, updateSheetCell } from './sheet-actions';

const COLS = 26;
const INITIAL_ROWS = 50;

function colLabel(index: number) {
  return String.fromCharCode(65 + index);
}

export default function SheetView() {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    getSheetCells().then((res) => {
      const map: Record<string, string> = {};
      (res.cells ?? []).forEach((c: { row_index: number; col_index: number; value: string | null }) => {
        map[`${c.row_index}-${c.col_index}`] = c.value ?? '';
      });
      setCells(map);
      setLoading(false);
    });
  }, []);

  function handleChange(row: number, col: number, value: string) {
    const key = `${row}-${col}`;
    setCells((prev) => ({ ...prev, [key]: value }));

    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      updateSheetCell(row, col, value);
    }, 600);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-600">
        Loading sheet...
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      style={{ maxHeight: '75vh' }}
    >
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 w-10 border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800" />
            {Array.from({ length: COLS }).map((_, c) => (
              <th
                key={c}
                className="sticky top-0 z-10 min-w-[110px] border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {colLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              <td className="sticky left-0 z-10 w-10 border border-neutral-200 bg-neutral-100 px-2 py-1 text-center text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
                {r + 1}
              </td>
              {Array.from({ length: COLS }).map((_, c) => (
                <td key={c} className="border border-neutral-200 p-0 dark:border-neutral-800">
                  <input
                    value={cells[`${r}-${c}`] ?? ''}
                    onChange={(e) => handleChange(r, c, e.target.value)}
                    className="w-full min-w-[110px] border-0 bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none focus:bg-red-50 dark:text-neutral-100 dark:focus:bg-red-900/20"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
        <button
          onClick={() => setRows((r) => r + 20)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          Add 20 rows
        </button>
      </div>
    </div>
  );
}
