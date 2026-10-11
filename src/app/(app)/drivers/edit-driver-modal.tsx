'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

const STATUS_OPTIONS = ['Available', 'On trip', 'Off duty', 'Unavailable'] as const;

const inputClass =
  'w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs text-neutral-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20';

const labelClass =
  'mb-1 block text-[10px] font-medium text-neutral-400';

const sectionClass =
  'border-t border-neutral-800 pt-3';

const sectionTitle =
  'mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400';

type Driver = Record<string, any>;
type UpdateDriver = (formData: FormData) => Promise<void>;

export default function EditDriverModal({
  driver,
  updateDriver,
}: {
  driver: Driver;
  updateDriver: UpdateDriver;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-500"
      >
        <span>›</span> Edit driver information
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="flex h-[min(760px,88vh)] w-[min(680px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Edit Driver</div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">{driver.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <form
                  action={async (formData) => {
                    await updateDriver(formData);
                    setOpen(false);
                  }}
                  className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
                >
                  <input type="hidden" name="id" value={driver.id} />

                  <section>
                    <h3 className={sectionTitle}>Personal details</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2"><label className={labelClass}>Full name *</label><input name="name" required defaultValue={driver.name ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Status</label><select name="status" defaultValue={driver.status ?? 'Available'} className={inputClass}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
                      <div><label className={labelClass}>Phone</label><input name="phone" defaultValue={driver.phone ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Email</label><input name="email" type="email" defaultValue={driver.email ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Date of birth</label><input name="date_of_birth" type="date" defaultValue={driver.date_of_birth ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Gender</label><select name="gender" defaultValue={driver.gender ?? ''} className={inputClass}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
                      <div><label className={labelClass}>Nationality</label><input name="nationality" defaultValue={driver.nationality ?? 'Nigerian'} className={inputClass} /></div>
                      <div><label className={labelClass}>Blood group</label><input name="blood_group" defaultValue={driver.blood_group ?? ''} className={inputClass} /></div>
                      <div className="sm:col-span-3"><label className={labelClass}>Current address</label><textarea name="address" rows={2} defaultValue={driver.address ?? ''} className={inputClass} /></div>
                    </div>
                  </section>

                  <section className={sectionClass}>
                    <h3 className={sectionTitle}>Licence & identity</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div><label className={labelClass}>Licence number *</label><input name="license_no" required defaultValue={driver.license_no ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Licence expiry</label><input name="license_expiry" type="date" defaultValue={driver.license_expiry ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>ID type</label><select name="id_type" defaultValue={driver.id_type ?? ''} className={inputClass}><option value="">Select</option><option>NIN</option><option>National ID</option><option>International Passport</option><option>Voter's Card</option><option>Other</option></select></div>
                      <div className="sm:col-span-2"><label className={labelClass}>ID number</label><input name="id_number" defaultValue={driver.id_number ?? ''} className={inputClass} /></div>
                    </div>
                  </section>

                  <section className={sectionClass}>
                    <h3 className={sectionTitle}>Next of kin</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div><label className={labelClass}>Name</label><input name="next_of_kin_name" defaultValue={driver.next_of_kin_name ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Relationship</label><input name="next_of_kin_relationship" defaultValue={driver.next_of_kin_relationship ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Phone</label><input name="next_of_kin_phone" defaultValue={driver.next_of_kin_phone ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Address</label><input name="next_of_kin_address" defaultValue={driver.next_of_kin_address ?? ''} className={inputClass} /></div>
                    </div>
                  </section>

                  <section className={sectionClass}>
                    <h3 className={sectionTitle}>Previous employment</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div><label className={labelClass}>Previous employer</label><input name="previous_employer" defaultValue={driver.previous_employer ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Employer phone</label><input name="previous_employer_phone" defaultValue={driver.previous_employer_phone ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Start date</label><input name="previous_employment_start" type="date" defaultValue={driver.previous_employment_start ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>End date</label><input name="previous_employment_end" type="date" defaultValue={driver.previous_employment_end ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Employer address</label><textarea name="previous_employer_address" rows={2} defaultValue={driver.previous_employer_address ?? ''} className={inputClass} /></div>
                      <div><label className={labelClass}>Emergency / additional notes</label><textarea name="emergency_notes" rows={2} defaultValue={driver.emergency_notes ?? ''} className={inputClass} /></div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-neutral-800 bg-neutral-950 pt-4">
                    <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800">Cancel</button>
                    <button type="submit" className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700">Save changes</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
