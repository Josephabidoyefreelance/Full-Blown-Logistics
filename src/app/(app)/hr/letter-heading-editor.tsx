'use client';

import { useRef, useState } from 'react';

const HIGHLIGHTS = [
  { label: 'Yellow', value: '#fff3a0' },
  { label: 'Green', value: '#bbf7c9' },
  { label: 'Red', value: '#fecaca' },
];

export default function LetterHeadingEditor({
  initialHtml,
  placeholder,
  onSave,
}: {
  initialHtml: string | null;
  placeholder: string;
  onSave: (html: string) => Promise<{ error: string | null }>;
}) {
  const [html, setHtml] = useState(initialHtml || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function format(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
  }

  async function handleSave() {
    const next = ref.current?.innerHTML ?? '';
    setSaving(true);
    setError(null);
    const res = await onSave(next);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setHtml(next);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="mb-4 print:mb-4">
        {html ? (
          <div className="text-base font-semibold text-neutral-900" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="text-sm italic text-neutral-400">{placeholder}</div>
        )}
        <button
          onClick={() => setEditing(true)}
          className="mt-1 text-xs font-medium text-red-700 hover:underline print:hidden dark:text-red-500"
          type="button"
        >
          {html ? 'Edit heading' : 'Add heading'}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-neutral-300 p-2 print:hidden dark:border-neutral-700">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format('bold')}
          className="rounded border border-neutral-300 px-2 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format('italic')}
          className="rounded border border-neutral-300 px-2 py-1 text-xs italic text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          I
        </button>
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.value}
            type="button"
            title={`Highlight ${h.label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('hiliteColor', h.value)}
            className="h-6 w-6 rounded border border-neutral-300 dark:border-neutral-700"
            style={{ backgroundColor: h.value }}
          />
        ))}
        <button
          type="button"
          title="Clear highlight"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format('hiliteColor', 'transparent')}
          className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Clear
        </button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
        className="min-h-[2.5rem] rounded border border-dashed border-neutral-300 p-2 text-base font-semibold text-neutral-900 outline-none dark:border-neutral-700"
        data-placeholder={placeholder}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
