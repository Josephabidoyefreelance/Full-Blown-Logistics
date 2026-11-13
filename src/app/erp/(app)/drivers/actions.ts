'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const RATING_COLUMNS = [
  'communication_rating',
  'punctuality_rating',
  'neatness_rating',
  'composure_rating',
] as const;
export type RatingColumn = (typeof RATING_COLUMNS)[number];

const STATUS_OPTIONS = ['Available', 'On trip', 'Off duty', 'Unavailable'];

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

function fileFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function uploadFile(supabase: Awaited<ReturnType<typeof createClient>>, driverId: string, file: File, kind: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  const path = `${driverId}/${kind}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('driver-documents').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) return { error: error.message, path: null as string | null };
  return { error: null as string | null, path };
}

export async function updateDriverStatus(id: string, status: string) {
  if (!id || !STATUS_OPTIONS.includes(status)) return { error: 'Invalid driver status.' };
  const supabase = await createClient();
  const { error } = await supabase.from('drivers').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/drivers');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function updateDriverCategoryRating(id: string, column: RatingColumn, rating: number) {
  if (!RATING_COLUMNS.includes(column)) return { error: 'Invalid rating category.' };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { error: 'Rating must be between 1 and 5.' };
  const supabase = await createClient();
  const { error } = await supabase.from('drivers').update({ [column]: rating }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/drivers');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function createDriver(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get('name') ?? '').trim();
  const license_no = String(formData.get('license_no') ?? '').trim();
  if (!name || !license_no) return { error: 'Full name and licence number are required.' };

  const status = String(formData.get('status') ?? 'Available');
  if (!STATUS_OPTIONS.includes(status)) return { error: 'Invalid driver status.' };

  const driverId = crypto.randomUUID();
  const photo = fileFrom(formData, 'photo');
  const idDocument = fileFrom(formData, 'id_document');
  const licenseDocument = fileFrom(formData, 'license_document');
  const files = [photo, idDocument, licenseDocument].filter(Boolean) as File[];
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) return { error: 'Each uploaded document/photo must be 8MB or smaller.' };
  }

  const uploaded: string[] = [];
  let photo_path: string | null = null;
  let id_document_path: string | null = null;
  let license_document_path: string | null = null;

  for (const [file, kind] of [[photo, 'photo'], [idDocument, 'id'], [licenseDocument, 'licence']] as const) {
    if (!file) continue;
    const result = await uploadFile(supabase, driverId, file, kind);
    if (result.error || !result.path) {
      for (const path of uploaded) await supabase.storage.from('driver-documents').remove([path]);
      return { error: result.error ?? 'Could not upload driver document.' };
    }
    uploaded.push(result.path);
    if (kind === 'photo') photo_path = result.path;
    if (kind === 'id') id_document_path = result.path;
    if (kind === 'licence') license_document_path = result.path;
  }

  const payload = {
    id: driverId,
    name,
    license_no,
    license_expiry: clean(formData.get('license_expiry')),
    status,
    trips_completed: 0,
    rating: null,
    phone: clean(formData.get('phone')),
    email: clean(formData.get('email')),
    address: clean(formData.get('address')),
    date_of_birth: clean(formData.get('date_of_birth')),
    gender: clean(formData.get('gender')),
    nationality: clean(formData.get('nationality')),
    blood_group: clean(formData.get('blood_group')),
    next_of_kin_name: clean(formData.get('next_of_kin_name')),
    next_of_kin_relationship: clean(formData.get('next_of_kin_relationship')),
    next_of_kin_phone: clean(formData.get('next_of_kin_phone')),
    next_of_kin_address: clean(formData.get('next_of_kin_address')),
    previous_employer: clean(formData.get('previous_employer')),
    previous_employer_phone: clean(formData.get('previous_employer_phone')),
    previous_employer_address: clean(formData.get('previous_employer_address')),
    previous_employment_start: clean(formData.get('previous_employment_start')),
    previous_employment_end: clean(formData.get('previous_employment_end')),
    id_type: clean(formData.get('id_type')),
    id_number: clean(formData.get('id_number')),
    photo_path,
    id_document_path,
    license_document_path,
    emergency_notes: clean(formData.get('emergency_notes')),
  };

  const { error } = await supabase.from('drivers').insert(payload);
  if (error) {
    for (const path of uploaded) await supabase.storage.from('driver-documents').remove([path]);
    return { error: error.message };
  }

  revalidatePath('/drivers');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function createDriverOnboardingLink(driverId: string) {
  if (!driverId) return { error: 'Driver is required.' };
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase.from('driver_onboarding_links').insert({ driver_id: driverId, token });
  if (error) return { error: error.message };
  revalidatePath('/drivers');
  return { error: null, token };
}

export async function getDriverFileUrl(path: string | null) {
  if (!path) return { url: null };
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(path, 60 * 10);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl };
}
