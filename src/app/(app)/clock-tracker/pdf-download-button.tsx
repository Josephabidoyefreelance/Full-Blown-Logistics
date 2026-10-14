'use client';

import { useState } from 'react';

export default function PdfDownloadButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function downloadReport() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/clock-tracker/report', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/pdf' },
      });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.toLowerCase().includes('application/pdf')) {
        let message = `PDF download failed (HTTP ${response.status}).`;
        try {
          const body = await response.json();
          if (typeof body?.error === 'string') message = body.error;
        } catch {
          // A non-JSON response usually means the API route is missing or returned an HTML error page.
          if (response.status === 404) message = 'PDF route not found. Confirm the route is installed at src/app/api/clock-tracker/report/route.ts and restart Next.js.';
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      if (blob.size < 8 || (await blob.slice(0, 5).text()) !== '%PDF-') {
        throw new Error('The report endpoint did not return a valid PDF file. Check the server logs.');
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'JAAD-Clock-Tracker-Report.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download the PDF report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={downloadReport}
        disabled={loading}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <span aria-hidden="true">↓</span>{loading ? 'Preparing PDF…' : 'Download PDF report'}
      </button>
      {error && <p role="alert" className="max-w-sm text-right text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
