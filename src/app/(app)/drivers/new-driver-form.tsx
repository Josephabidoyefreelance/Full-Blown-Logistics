'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createDriver } from './actions';

const STATUS_OPTIONS = ['Available', 'On trip', 'Off duty', 'Unavailable'];

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
const labelClass = 'mb-0.5 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400';
const sectionClass = 'border-t border-neutral-200 pt-3 dark:border-neutral-800';
const sectionTitle = 'mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';

export default function NewDriverForm() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) close();
    };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
    };
  }, [open, isPending]);

  function close() {
    if (isPending) return;
    setError(null);
    setOpen(false);
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createDriver(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  const modal = open ? (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-driver-title"
    >
      <div
        className="flex h-[72vh] max-h-[680px] w-[92vw] max-w-[680px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Short fixed header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 id="add-driver-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Add driver</h2>
            <p className="truncate text-[10px] text-neutral-500">Biodata, identity, documents, next of kin and employment.</p>
          </div>
          <button type="button" onClick={close} disabled={isPending} aria-label="Close" className="ml-3 rounded-md px-2 py-1 text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:hover:bg-neutral-800">×</button>
        </div>

        {/* ONLY this area scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

          <form ref={formRef} action={submit} className="space-y-3">
            <section>
              <h3 className={sectionTitle}>Personal details</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2"><label className={labelClass}>Full name *</label><input name="name" required className={inputClass} placeholder="Musa Bello" /></div>
                <div><label className={labelClass}>Status</label><select name="status" defaultValue="Available" className={inputClass}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></div>
                <div><label className={labelClass}>Phone</label><input name="phone" className={inputClass} /></div>
                <div><label className={labelClass}>Email</label><input name="email" type="email" className={inputClass} /></div>
                <div><label className={labelClass}>Date of birth</label><input name="date_of_birth" type="date" className={inputClass} /></div>
                <div><label className={labelClass}>Gender</label><select name="gender" className={inputClass}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
                <div><label className={labelClass}>Nationality</label><input name="nationality" defaultValue="Nigerian" className={inputClass} /></div>
                <div><label className={labelClass}>Blood group</label><input name="blood_group" placeholder="O+" className={inputClass} /></div>
                <div className="sm:col-span-3"><label className={labelClass}>Current address</label><textarea name="address" rows={1} className={inputClass} /></div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitle}>Licence & identity</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div><label className={labelClass}>Licence number *</label><input name="license_no" required className={inputClass} placeholder="LAG-DL-55021" /></div>
                <div><label className={labelClass}>Licence expiry</label><input name="license_expiry" type="date" className={inputClass} /></div>
                <div><label className={labelClass}>ID type</label><select name="id_type" className={inputClass}><option value="">Select</option><option>NIN</option><option>National ID</option><option>International Passport</option><option>Voter's Card</option><option>Other</option></select></div>
                <div><label className={labelClass}>ID number</label><input name="id_number" className={inputClass} /></div>
                <div><label className={labelClass}>Driver photo</label><input name="photo" type="file" accept="image/*" className={inputClass} /></div>
                <div><label className={labelClass}>ID document</label><input name="id_document" type="file" accept="image/*,.pdf" className={inputClass} /></div>
                <div><label className={labelClass}>Licence document</label><input name="license_document" type="file" accept="image/*,.pdf" className={inputClass} /></div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitle}>Next of kin</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><label className={labelClass}>Name</label><input name="next_of_kin_name" className={inputClass} /></div>
                <div><label className={labelClass}>Relationship</label><input name="next_of_kin_relationship" className={inputClass} placeholder="Spouse, parent, sibling" /></div>
                <div><label className={labelClass}>Phone</label><input name="next_of_kin_phone" className={inputClass} /></div>
                <div><label className={labelClass}>Address</label><input name="next_of_kin_address" className={inputClass} /></div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitle}>Previous employment</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div><label className={labelClass}>Previous employer</label><input name="previous_employer" className={inputClass} /></div>
                <div><label className={labelClass}>Employer phone</label><input name="previous_employer_phone" className={inputClass} /></div>
                <div><label className={labelClass}>Start date</label><input name="previous_employment_start" type="date" className={inputClass} /></div>
                <div><label className={labelClass}>End date</label><input name="previous_employment_end" type="date" className={inputClass} /></div>
                <div><label className={labelClass}>Employer address</label><textarea name="previous_employer_address" rows={1} className={inputClass} /></div>
                <div><label className={labelClass}>Emergency / additional notes</label><textarea name="emergency_notes" rows={1} className={inputClass} /></div>
              </div>
            </section>
          </form>
        </div>

        {/* Sticky footer: always visible while scrolling */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
          <button type="button" onClick={close} disabled={isPending} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
          <button type="button" disabled={isPending} onClick={() => formRef.current?.requestSubmit()} className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">{isPending ? 'Saving...' : 'Add driver'}</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={() => { setError(null); setOpen(true); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">+ Add driver</button>
      {mounted && createPortal(modal, document.body)}
    </>
  );
}
