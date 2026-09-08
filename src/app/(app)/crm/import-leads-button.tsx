'use client';

import { useRef, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { importLeads } from './actions';

const TEMPLATE_HEADERS = [
  'company',
  'contact_name',
  'job_title',
  'email',
  'phone',
  'source',
  'priority',
  'transport_mode',
  'origin',
  'destination',
  'value',
];

function downloadTemplate() {
  const exampleRow = [
    'Acme Textiles',
    'Ada Lovelace',
    'Procurement Manager',
    'ada@acme.com',
    '08012345678',
    'Website',
    'Hot',
    'Trucks / Haulage',
    'Lagos',
    'Kano',
    '500000',
  ];
  const csv = TEMPLATE_HEADERS.join(',') + '\n' + exampleRow.join(',');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportLeadsButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setOpen(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      startTransition(async () => {
        const res = await importLeads(rows as Record<string, unknown>[]);
        if (res.error) setError(res.error);
        else setResult({ imported: res.imported, skipped: res.skipped });
      });
    } catch {
      setError('Could not read that file. Use .xlsx, .xls, or .csv with the template headers.');
    }

    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="relative">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {isPending ? 'Importing...' : 'Import'}
      </button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 flex items-start justify-between">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">Import leads</span>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Close
            </button>
          </div>

          {error && <p className="mb-2 text-red-600 dark:text-red-400">{error}</p>}

          {result && (
            <p className="mb-2 text-neutral-700 dark:text-neutral-300">
              Imported {result.imported} lead{result.imported === 1 ? '' : 's'}.
              {result.skipped > 0 &&
                ` Skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} missing company, contact name, or phone.`}
            </p>
          )}

          {!result && !error && !isPending && (
            <p className="mb-2 text-neutral-500 dark:text-neutral-400">
              Columns must match the template exactly: company, contact_name, phone are required.
            </p>
          )}

          <button
            onClick={downloadTemplate}
            className="text-red-600 hover:underline dark:text-red-400"
          >
            Download template
          </button>
        </div>
      )}
    </div>
  );
}
