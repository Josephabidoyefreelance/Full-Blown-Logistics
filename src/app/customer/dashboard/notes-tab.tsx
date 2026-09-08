'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Note = {
  id: string;
  content: string;
  updated_at: string;
};

const TEXT_COLORS = [
  { key: '#f5f5f6', label: 'Default' },
  { key: '#e5231b', label: 'Red' },
  { key: '#eab308', label: 'Yellow' },
  { key: '#22c55e', label: 'Green' },
  { key: '#3b82f6', label: 'Blue' },
  { key: '#a855f7', label: 'Purple' },
];

export default function NotesTab() {
  const supabase = createClient();
  const editorRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('customer_notes')
      .select('id, content, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) setError(error.message);
    setNotes(data ?? []);
    setLoading(false);
  }

  function format(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  async function handleSaveNew() {
    const content = editorRef.current?.innerHTML ?? '';
    if (!content.trim() || content === '<br>') return;

    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('customer_notes').insert({
      user_id: user.id,
      content,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (editorRef.current) editorRef.current.innerHTML = '';
    load();
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('customer_notes').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const toolbarBtn = 'flex h-8 w-8 items-center justify-center rounded-sm border border-[var(--input-border)] text-[var(--text)] hover:bg-[var(--input-bg)]';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="mb-3 text-base font-bold text-[var(--text)]">New note</h3>

        {error && (
          <div className="mb-3 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-[12px] text-[var(--error-text)]">
            {error}
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => format('bold')} className={toolbarBtn} title="Bold">
              <strong>B</strong>
            </button>
            <button type="button" onClick={() => format('italic')} className={`${toolbarBtn} italic`} title="Italic">
              I
            </button>
            <button type="button" onClick={() => format('underline')} className={`${toolbarBtn} underline`} title="Underline">
              U
            </button>
            <button type="button" onClick={() => format('insertUnorderedList')} className={toolbarBtn} title="Bullet list">
              &bull;
            </button>
            <button type="button" onClick={() => format('insertOrderedList')} className={toolbarBtn} title="Numbered list">
              1.
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase text-[var(--subtext)]">Text color</span>
            {TEXT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => format('foreColor', c.key)}
                className="h-6 w-6 rounded-full border border-[var(--border)]"
                style={{ backgroundColor: c.key }}
              />
            ))}
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="mb-3 h-[160px] w-full overflow-y-auto rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] p-4 text-sm leading-relaxed text-[var(--text)] outline-none focus:border-[#e5231b] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        />

        <button
          onClick={handleSaveNew}
          disabled={saving}
          className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save note'}
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-[var(--text)]">Your notes</h3>
        {loading ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
            No notes yet. Write one above and save it.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div key={note.id} className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <div
                  className="mb-3 flex-1 text-sm leading-relaxed text-[var(--text)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="flex items-center justify-end border-t border-[var(--border)] pt-3">
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-[11px] font-semibold text-[var(--error-text)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
