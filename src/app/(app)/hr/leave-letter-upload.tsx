'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadLeaveLetter } from './actions';

export default function LeaveLetterUpload({ leaveId, url }: { leaveId: string; url: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set('leaveId', leaveId);
    fd.set('file', file);
    startTransition(async () => {
      const res = await uploadLeaveLetter(fd);
      if (res?.error) setError(res.error);
      if (fileRef.current) fileRef.current.value = '';
    });
  }

  return (
    <div className="flex items-center gap-2">
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          View letter
        </a>
      )}
      <label className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
        {isPending ? 'Uploading...' : url ? 'Replace' : 'Upload letter'}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} disabled={isPending} />
      </label>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
