import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createDriver } from './actions';
import StatusSwitch from './status-switch';
import StarRating from './star-rating';
import DriverProfileModal from './driver-profile-modal';
import DriverLiveRefresh from './live-refresh';
import EditDriverModal from './edit-driver-modal';

const TABS = [
  { key: 'profiles', label: 'Profiles' },
  { key: 'performance', label: 'Performance' },
] as const;

const STATUS_OPTIONS = ['Available', 'On trip', 'Off duty', 'Unavailable'] as const;
const inputClass = 'w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
const labelClass = 'mb-0.5 block text-[10px] font-medium text-neutral-500 dark:text-neutral-400';
const sectionClass = 'border-t border-neutral-200 pt-3 dark:border-neutral-800';
const sectionTitle = 'mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';

function average(values: (number | null)[]) {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

export async function updateDriver(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const license_no = String(formData.get('license_no') ?? '').trim();
  const status = String(formData.get('status') ?? 'Available');
  if (!id || !name || !license_no || !STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) return;
  const supabase = await createClient();
  const { error } = await supabase.from('drivers').update({
    name, license_no, license_expiry: clean(formData.get('license_expiry')), status,
    phone: clean(formData.get('phone')), email: clean(formData.get('email')), address: clean(formData.get('address')),
    date_of_birth: clean(formData.get('date_of_birth')), gender: clean(formData.get('gender')), nationality: clean(formData.get('nationality')),
    blood_group: clean(formData.get('blood_group')), next_of_kin_name: clean(formData.get('next_of_kin_name')),
    next_of_kin_relationship: clean(formData.get('next_of_kin_relationship')), next_of_kin_phone: clean(formData.get('next_of_kin_phone')),
    next_of_kin_address: clean(formData.get('next_of_kin_address')), previous_employer: clean(formData.get('previous_employer')),
    previous_employer_phone: clean(formData.get('previous_employer_phone')), previous_employer_address: clean(formData.get('previous_employer_address')),
    previous_employment_start: clean(formData.get('previous_employment_start')), previous_employment_end: clean(formData.get('previous_employment_end')),
    id_type: clean(formData.get('id_type')), id_number: clean(formData.get('id_number')), emergency_notes: clean(formData.get('emergency_notes')),
  }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/drivers');
  revalidatePath('/dashboard');
}

function AddDriverForm() {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">+ Add driver</summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-[10000] w-[min(680px,calc(100vw-24px))]">
        <div className="flex max-h-[72vh] w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800"><div><h2 className="text-sm font-semibold">Add driver</h2><p className="text-[10px] text-neutral-500">Biodata, identity, documents, next of kin and employment.</p></div><span className="text-xs text-neutral-400">Scroll to complete</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <form action={createDriver} className="space-y-3">
              <section><h3 className={sectionTitle}>Personal details</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2"><label className={labelClass}>Full name *</label><input name="name" required className={inputClass} /></div>
                <div><label className={labelClass}>Status</label><select name="status" defaultValue="Available" className={inputClass}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className={labelClass}>Phone</label><input name="phone" className={inputClass} /></div><div><label className={labelClass}>Email</label><input name="email" type="email" className={inputClass} /></div><div><label className={labelClass}>Date of birth</label><input name="date_of_birth" type="date" className={inputClass} /></div>
                <div><label className={labelClass}>Gender</label><select name="gender" className={inputClass}><option value="">Select</option><option>Male</option><option>Female</option></select></div><div><label className={labelClass}>Nationality</label><input name="nationality" defaultValue="Nigerian" className={inputClass} /></div><div><label className={labelClass}>Blood group</label><input name="blood_group" placeholder="O+" className={inputClass} /></div>
                <div className="sm:col-span-3"><label className={labelClass}>Current address</label><textarea name="address" rows={1} className={inputClass} /></div>
              </div></section>
              <section className={sectionClass}><h3 className={sectionTitle}>Licence & identity</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div><label className={labelClass}>Licence number *</label><input name="license_no" required className={inputClass} /></div><div><label className={labelClass}>Licence expiry</label><input name="license_expiry" type="date" className={inputClass} /></div><div><label className={labelClass}>ID type</label><select name="id_type" className={inputClass}><option value="">Select</option><option>NIN</option><option>National ID</option><option>International Passport</option><option>Voter's Card</option><option>Other</option></select></div>
                <div><label className={labelClass}>ID number</label><input name="id_number" className={inputClass} /></div><div><label className={labelClass}>Driver photo</label><input name="photo" type="file" accept="image/*" className={inputClass} /></div><div><label className={labelClass}>ID document</label><input name="id_document" type="file" accept="image/*,.pdf" className={inputClass} /></div><div><label className={labelClass}>Licence document</label><input name="license_document" type="file" accept="image/*,.pdf" className={inputClass} /></div>
              </div></section>
              <section className={sectionClass}><h3 className={sectionTitle}>Next of kin</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div><label className={labelClass}>Name</label><input name="next_of_kin_name" className={inputClass} /></div><div><label className={labelClass}>Relationship</label><input name="next_of_kin_relationship" className={inputClass} /></div><div><label className={labelClass}>Phone</label><input name="next_of_kin_phone" className={inputClass} /></div><div><label className={labelClass}>Address</label><input name="next_of_kin_address" className={inputClass} /></div></div></section>
              <section className={sectionClass}><h3 className={sectionTitle}>Previous employment</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div><label className={labelClass}>Previous employer</label><input name="previous_employer" className={inputClass} /></div><div><label className={labelClass}>Employer phone</label><input name="previous_employer_phone" className={inputClass} /></div><div><label className={labelClass}>Start date</label><input name="previous_employment_start" type="date" className={inputClass} /></div><div><label className={labelClass}>End date</label><input name="previous_employment_end" type="date" className={inputClass} /></div><div><label className={labelClass}>Employer address</label><textarea name="previous_employer_address" rows={1} className={inputClass} /></div><div><label className={labelClass}>Emergency / additional notes</label><textarea name="emergency_notes" rows={1} className={inputClass} /></div></div></section>
              <div className="flex justify-end border-t border-neutral-200 pt-3 dark:border-neutral-800"><button type="submit" className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700">Add driver</button></div>
            </form>
          </div>
        </div>
      </div>
    </details>
  );
}

export default async function DriversPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const params = await searchParams;
  const view = params.view === 'performance' ? 'performance' : 'profiles';
  const selectedStatus = params.status ?? 'All';
  const supabase = await createClient();
  const { data: drivers, error } = await supabase.from('drivers').select('id,name,license_no,license_expiry,status,trips_completed,communication_rating,punctuality_rating,neatness_rating,composure_rating,phone,email,address,date_of_birth,gender,nationality,blood_group,next_of_kin_name,next_of_kin_relationship,next_of_kin_phone,next_of_kin_address,previous_employer,previous_employer_phone,previous_employer_address,previous_employment_start,previous_employment_end,id_type,id_number,photo_path,id_document_path,license_document_path,emergency_notes').order('name');
  const all = drivers ?? [];
  const filtered = selectedStatus === 'All' ? all : all.filter(d => d.status === selectedStatus);
  const available = all.filter(d => d.status === 'Available').length;
  const onTrip = all.filter(d => d.status === 'On trip').length;
  const offDuty = all.filter(d => d.status === 'Off duty').length;
  const rated = all.map(d => average([d.communication_rating,d.punctuality_rating,d.neatness_rating,d.composure_rating])).filter((v): v is number => v != null);
  const overallFleet = rated.length ? rated.reduce((a,b)=>a+b,0)/rated.length : null;
  const topRated = [...all].sort((a,b)=>(average([b.communication_rating,b.punctuality_rating,b.neatness_rating,b.composure_rating]) ?? -1)-(average([a.communication_rating,a.punctuality_rating,a.neatness_rating,a.composure_rating]) ?? -1)).slice(0,3);

  return <div>
    <DriverLiveRefresh />
    <div className="mb-4 flex items-start justify-between gap-4"><div><h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Driver Management</h1><p className="text-sm text-neutral-500">Driver profiles, availability and performance control.</p></div><AddDriverForm /></div>

    {/* Compact operations dashboard */}
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
      {[
        ['Total drivers', all.length, 'Driver records'],
        ['Available', available, 'Ready for dispatch'],
        ['On trip', onTrip, 'Currently deployed'],
        ['Off duty', offDuty, 'Not on shift'],
        ['Avg. performance', overallFleet == null ? '—' : overallFleet.toFixed(1), 'Out of 5.0'],
      ].map(([label,value,sub]) => <div key={String(label)} className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p><p className="text-[10px] text-neutral-500">{sub}</p></div>)}
    </div>

    <div className="mb-4 flex flex-wrap items-center gap-2">
      {[
        ['All', all.length, '/drivers?view=profiles&status=All'],
        ['Available', available, '/drivers?view=profiles&status=Available'],
        ['On trip', onTrip, '/drivers?view=profiles&status=On%20trip'],
        ['Off duty', offDuty, '/drivers?view=profiles&status=Off%20duty'],
      ].map(([label,value,href]) => <a key={String(label)} href={String(href)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:border-red-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">{label} <b>{value}</b></a>)}
    </div>

    <div className="mb-5 flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
      {TABS.map(t => <a key={t.key} href={`/drivers?view=${t.key}${selectedStatus !== 'All' ? `&status=${encodeURIComponent(selectedStatus)}` : ''}`} className={`pb-2.5 text-sm font-medium ${view === t.key ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>{t.label}</a>)}
    </div>
    {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">Could not load drivers: {error.message}</p>}

    {view === 'profiles' && <>
      <div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Driver profiles</h2><p className="text-xs text-neutral-500">Compact operational cards with availability and core records.</p></div><span className="text-[10px] text-neutral-400">{filtered.length} shown</span></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(d => <div key={d.id} className="group rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-red-900/60">
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><DriverProfileModal driver={d} /><div className="mt-2 flex items-center gap-2"><span className="text-[10px] text-neutral-500">Licence</span><span className="truncate font-mono text-[10px] text-neutral-700 dark:text-neutral-300">{d.license_no || '—'}</span></div><div className="mt-1 text-[10px] text-neutral-500">Expiry: {d.license_expiry || '—'}</div><EditDriverModal driver={d} updateDriver={updateDriver} /></div><StatusSwitch id={d.id} status={d.status} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800"><div><p className="text-[9px] uppercase tracking-wide text-neutral-400">Trips</p><p className="mt-0.5 text-sm font-semibold">{d.trips_completed ?? 0}</p></div><div><p className="text-[9px] uppercase tracking-wide text-neutral-400">Performance</p><p className="mt-0.5 text-sm font-semibold">{(average([d.communication_rating,d.punctuality_rating,d.neatness_rating,d.composure_rating]) ?? 0).toFixed(1)} / 5</p></div></div>
        </div>)}
      </div>
      {!filtered.length && !error && <div className="rounded-xl border border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-400 dark:border-neutral-700">No drivers in this status.</div>}
    </>}

    {view === 'performance' && <>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {topRated.map(d => { const score = average([d.communication_rating,d.punctuality_rating,d.neatness_rating,d.composure_rating]); return <div key={d.id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><div className="flex items-center justify-between"><DriverProfileModal driver={d} /><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600">{score == null ? 'Unrated' : `${score.toFixed(1)} / 5`}</span></div><p className="mt-2 text-[10px] text-neutral-500">Top current rating</p></div> })}
      </div>
      <div className="mb-3"><h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Driver performance</h2><p className="text-xs text-neutral-500">Compact performance cards. Update individual category ratings directly.</p></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(d => { const overall = average([d.communication_rating,d.punctuality_rating,d.neatness_rating,d.composure_rating]); return <article key={d.id} className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><DriverProfileModal driver={d} /><p className="mt-1 text-[10px] text-neutral-500">{d.trips_completed ?? 0} trips completed</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wide text-neutral-400">Overall</p><p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{overall == null ? '—' : overall.toFixed(1)}</p></div></div>
          <div className="mt-3 space-y-2">
            {[['Communication','communication_rating'],['Punctuality','punctuality_rating'],['Neatness','neatness_rating'],['Composure','composure_rating']].map(([label,column]) => <div key={column} className="flex items-center justify-between gap-2"><span className="w-20 text-[10px] text-neutral-500">{label}</span><StarRating id={d.id} column={column as 'communication_rating'|'punctuality_rating'|'neatness_rating'|'composure_rating'} value={d[column as keyof typeof d] as number | null} /></div>)}
          </div>
        </article> })}
      </div>
    </>}
  </div>;
}
