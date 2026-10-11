'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { createDriverOnboardingLink, getDriverFileUrl } from './actions';

type Driver = Record<string, any>;

export default function DriverProfileModal({ driver }: { driver: Driver }) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy]);

  function openProfile() {
    // Open the modal immediately. Never wait for Supabase/storage before showing it.
    setLink(null);
    setPhotoUrl(null);
    setOpen(true);

    if (driver.photo_path) {
      void getDriverFileUrl(driver.photo_path).then((result) => {
        if (result.url) setPhotoUrl(result.url);
      });
    }
  }

  function close() {
    if (!busy) setOpen(false);
  }

  function generateLink() {
    setBusy(true);
    void createDriverOnboardingLink(driver.id)
      .then(async (result) => {
        if (result.error) {
          window.alert(result.error);
          return;
        }
        const url = `${window.location.origin}/driver-onboarding/${result.token}`;
        setLink(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // Clipboard permission is optional.
        }
        window.alert('Driver onboarding link created and copied.');
      })
      .finally(() => setBusy(false));
  }

  const modal = open ? (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Driver file for ${driver.name}`}
    >
      <div
        className="flex h-auto max-h-[78vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">Driver File — {driver.name}</h2>
            <p className="truncate text-[10px] text-neutral-500">Biodata, identity, next of kin, employment and performance.</p>
          </div>
          <button type="button" onClick={close} disabled={busy} className="ml-3 rounded-md px-2 py-1 text-lg leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:hover:bg-neutral-800" aria-label="Close">×</button>
        </div>

        <div id={`driver-print-${driver.id}`} className="driver-print-sheet min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          <div className="flex gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
              {photoUrl ? <img src={photoUrl} alt={driver.name} className="h-full w-full object-cover" /> : <span className="text-center text-[9px] text-neutral-400">{driver.photo_path ? 'Loading…' : 'No photo'}</span>}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Info label="Full name" value={driver.name}/><Info label="Status" value={driver.status}/><Info label="Phone" value={driver.phone}/><Info label="Email" value={driver.email}/><Info label="Licence" value={driver.license_no}/><Info label="Licence expiry" value={driver.license_expiry}/>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Section title="Personal"><Info label="Date of birth" value={driver.date_of_birth}/><Info label="Gender" value={driver.gender}/><Info label="Nationality" value={driver.nationality}/><Info label="Blood group" value={driver.blood_group}/><Info label="Address" value={driver.address}/></Section>
            <Section title="Identity"><Info label="ID type" value={driver.id_type}/><Info label="ID number" value={driver.id_number}/><Info label="ID document" value={driver.id_document_path ? 'Uploaded' : 'Not uploaded'}/><Info label="Licence document" value={driver.license_document_path ? 'Uploaded' : 'Not uploaded'}/></Section>
            <Section title="Next of kin"><Info label="Name" value={driver.next_of_kin_name}/><Info label="Relationship" value={driver.next_of_kin_relationship}/><Info label="Phone" value={driver.next_of_kin_phone}/><Info label="Address" value={driver.next_of_kin_address}/></Section>
            <Section title="Previous employment"><Info label="Employer" value={driver.previous_employer}/><Info label="Phone" value={driver.previous_employer_phone}/><Info label="Start" value={driver.previous_employment_start}/><Info label="End" value={driver.previous_employment_end}/><Info label="Address" value={driver.previous_employer_address}/></Section>
            <Section title="Performance"><Info label="Trips completed" value={driver.trips_completed ?? 0}/><Info label="Communication" value={rating(driver.communication_rating)}/><Info label="Punctuality" value={rating(driver.punctuality_rating)}/><Info label="Neatness" value={rating(driver.neatness_rating)}/><Info label="Composure" value={rating(driver.composure_rating)}/></Section>
            <Section title="Notes"><Info label="Emergency / additional notes" value={driver.emergency_notes}/></Section>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
          <button type="button" onClick={generateLink} disabled={busy} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300">{busy ? 'Working…' : 'Generate onboarding link'}</button>
          {link && <span className="max-w-[220px] truncate text-[10px] text-emerald-600">{link}</span>}
          <span className="flex-1" />
          <button type="button" onClick={close} disabled={busy} className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300">Close</button>
          <button type="button" onClick={() => window.print()} className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700">Print File</button>
        </div>
      </div>

      <style>{`@media print {
        body * { visibility: hidden !important; }
        .driver-print-sheet, .driver-print-sheet * { visibility: visible !important; }
        .driver-print-sheet { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; background: white !important; color: black !important; }
      }`}</style>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={openProfile} className="flex min-w-0 w-full items-center gap-3 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">{initials(driver.name)}</div>
        <div className="min-w-0"><div className="truncate font-semibold text-neutral-900 hover:text-red-600 dark:text-neutral-100 dark:hover:text-red-400">{driver.name}</div><div className="truncate text-xs text-neutral-500">{driver.phone || 'No phone added'}</div></div>
      </button>
      {open && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </>
  );
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x: string) => x[0]).join('').toUpperCase() || 'DR'; }
function rating(value: unknown) { return value ? `${value}/5` : '—'; }
function Info({ label, value }: { label: string; value: unknown }) { return <div><div className="text-[9px] uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-0.5 break-words text-[11px] font-medium text-neutral-900 dark:text-neutral-100">{String(value || '—')}</div></div>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800"><h3 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">{title}</h3><div className="space-y-1.5">{children}</div></section>; }
