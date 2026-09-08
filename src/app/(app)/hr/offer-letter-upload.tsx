'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadOfferLetter } from './actions';

export default function OfferLetterUpload({ employeeId, url }: { employeeId: string; url: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set('employeeId', employeeId);
    fd.set('file', file);
    startTransition(async () => {
      const res = await uploadOfferLetter(fd);
      if (res?.error) setError(res.error);
      if (fileRef.current) fileRef.current.value = '';
    });
  }

  return (
    <div className="flex items-center gap-2">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline dark:text-red-500">
          View
        </a>
      )}
      <label className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
        {isPending ? 'Uploading...' : url ? 'Replace' : 'Upload'}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} disabled={isPending} />
      </label>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
