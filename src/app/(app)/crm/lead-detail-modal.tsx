'use client';

import { useEffect, useState, useTransition } from 'react';
import LeadStatusSwitch from './lead-status-switch';
import LeadPrioritySwitch from './lead-priority-switch';
import AssignedToSwitch from './assigned-to-switch';
import { updateLeadDetails, addLeadNote, getLeadNotes, updateLeadCallbackDate } from './actions';

type Lead = {
  id: string;
  company: string;
  contact_name: string;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  priority: string;
  status: string;
  transport_mode?: string | null;
  origin?: string | null;
  destination?: string | null;
  value: number;
  assigned_to?: string | null;
  callback_date?: string | null;
};

type Staff = { id: string; full_name: string | null };

type Note = {
  id: string;
  note: string;
  author_name: string;
  created_at: string;
};

function nairaFmt(n: number) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

function EditField({
  label,
  name,
  defaultValue,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      />
    </div>
  );
}

export default function LeadDetailTrigger({ lead, staff }: { lead: Lead; staff: Staff[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [notePending, startNoteTransition] = useTransition();
  const [datePending, startDateTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setNotesLoading(true);
    getLeadNotes(lead.id).then((res) => {
      setNotes((res.notes as Note[]) ?? []);
      setNotesLoading(false);
    });
  }, [open, lead.id]);

  function close() {
    setOpen(false);
    setEditing(false);
    setError(null);
  }

  function handleAddNote() {
    if (!noteText.trim()) {
      setNoteError('Write something before saving.');
      return;
    }
    if (!authorName.trim()) {
      setNoteError('Enter your name so we know who left this note.');
      return;
    }
    setNoteError(null);
    startNoteTransition(async () => {
      const res = await addLeadNote(lead.id, noteText, authorName);
      if (res?.error) {
        setNoteError(res.error);
        return;
      }
      setNoteText('');
      const refreshed = await getLeadNotes(lead.id);
      setNotes((refreshed.notes as Note[]) ?? []);
    });
  }

  function handleCallbackDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    startDateTransition(() => {
      updateLeadCallbackDate(lead.id, value);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="truncate text-left font-medium text-neutral-900 hover:text-red-600 hover:underline dark:text-neutral-100"
      >
        {lead.company}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-8"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
          >
            <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Lead
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{lead.company}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-white dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Edit
                    </button>
                  )}
                  <button onClick={close} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                    Close
                  </button>
                </div>
              </div>
            </div>

            {!editing ? (
              <div className="px-6 py-5">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Contact" value={lead.contact_name} />
                  <Field label="Job title" value={lead.job_title || '—'} />
                  <Field label="Email" value={lead.email || '—'} />
                  <Field label="Phone" value={lead.phone || '—'} />
                  <Field label="Source" value={lead.source || '—'} />

                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      Priority
                    </dt>
                    <dd className="mt-1">
                      <LeadPrioritySwitch id={lead.id} priority={lead.priority} />
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <LeadStatusSwitch id={lead.id} status={lead.status} />
                    </dd>
                  </div>

                  <Field label="Transport mode" value={lead.transport_mode || '—'} />
                  <Field label="Origin" value={lead.origin || '—'} />
                  <Field label="Destination" value={lead.destination || '—'} />

                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      Assigned to
                    </dt>
                    <dd className="mt-1">
                      <AssignedToSwitch id={lead.id} assignedTo={lead.assigned_to ?? null} staff={staff} />
                    </dd>
                  </div>

                  <Field label="Deal value" value={nairaFmt(lead.value)} />
                </dl>

                <div className="mt-5 border-t border-neutral-100 pt-5 dark:border-neutral-800">
                  <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Notes & follow up
                  </h4>

                  <div className="mb-4">
                    <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      Call back date
                    </label>
                    <input
                      key={lead.callback_date ?? 'none'}
                      type="date"
                      defaultValue={lead.callback_date ?? ''}
                      disabled={datePending}
                      onChange={handleCallbackDateChange}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  <div className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                    {notesLoading && (
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading notes...</p>
                    )}
                    {!notesLoading && !notes.length && (
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">No notes yet.</p>
                    )}
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-md bg-white p-2 text-sm dark:bg-neutral-900">
                        <div className="mb-0.5 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                          {n.author_name} &middot; {formatNoteDate(n.created_at)}
                        </div>
                        <div className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{n.note}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-[1fr_140px] gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        Add a note
                      </label>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={3}
                        placeholder="What did the client say? When should we call back?"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        Your name
                      </label>
                      <input
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Joseph"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    </div>
                  </div>
                  {noteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{noteError}</p>}
                  <button
                    onClick={handleAddNote}
                    disabled={notePending}
                    className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {notePending ? 'Saving...' : 'Add note'}
                  </button>
                </div>
              </div>
            ) : (
              <form
                action={(fd) => {
                  setError(null);
                  startTransition(async () => {
                    const res = await updateLeadDetails(lead.id, fd);
                    if (res?.error) setError(res.error);
                    else setEditing(false);
                  });
                }}
                className="px-6 py-5"
              >
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Company" name="company" defaultValue={lead.company} />
                  <EditField label="Contact name" name="contact_name" defaultValue={lead.contact_name} />
                  <EditField label="Job title" name="job_title" defaultValue={lead.job_title ?? ''} />
                  <EditField label="Email" name="email" defaultValue={lead.email ?? ''} type="email" />
                  <EditField label="Phone" name="phone" defaultValue={lead.phone ?? ''} />
                  <EditField label="Transport mode" name="transport_mode" defaultValue={lead.transport_mode ?? ''} />
                  <EditField label="Origin" name="origin" defaultValue={lead.origin ?? ''} />
                  <EditField label="Destination" name="destination" defaultValue={lead.destination ?? ''} />
                  <EditField label="Deal value, NGN" name="value" defaultValue={String(lead.value ?? '')} type="number" />
                </div>

                {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
