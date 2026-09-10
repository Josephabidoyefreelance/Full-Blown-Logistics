'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateApplicantStage(id: string, stage: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('applicants').update({ stage }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function setLeaveStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('leave_requests').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function createEmployee(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  const department = String(formData.get('department') ?? '').trim();
  const role_title = String(formData.get('role_title') ?? '').trim();
  const status = String(formData.get('status') ?? 'Active');

  if (!name || !department || !role_title) {
    return { error: 'Name, department, and role are required.' };
  }

  const { error } = await supabase.from('employees').insert({
    name,
    department,
    role_title,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function createLeaveRequest(formData: FormData) {
  const supabase = await createClient();

  const employee_name = String(formData.get('employee_name') ?? '').trim();
  const leave_type = String(formData.get('leave_type') ?? '').trim();
  const from_date = String(formData.get('from_date') ?? '').trim();
  const to_date = String(formData.get('to_date') ?? '').trim();

  if (!employee_name || !leave_type || !from_date || !to_date) {
    return { error: 'Employee, type, and both dates are required.' };
  }

  const { error } = await supabase.from('leave_requests').insert({
    employee_name,
    leave_type,
    from_date,
    to_date,
    status: 'Requested',
  });

  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function createCareerPosting(formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get('title') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim() || 'Lagos, Nigeria';
  const employment_type = String(formData.get('employment_type') ?? '').trim() || 'Full-time';
  const description = String(formData.get('description') ?? '').trim();

  if (!title || !description) {
    return { error: 'Title and description are required.' };
  }

  const { error } = await supabase.from('career_postings').insert({
    title,
    location,
    employment_type,
    description,
  });

  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function removeCareerPosting(id: string) {
  if (!id) return { error: 'Missing posting id.' };
  const supabase = await createClient();
  const { error } = await supabase.from('career_postings').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function voteEmployee(id: string, currentVotes: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('employees')
    .update({ votes: (currentVotes ?? 0) + 1 })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function updateEmployeeOfferHeading(id: string, headingHtml: string) {
  if (!id) return { error: 'Missing employee id.' };
  const supabase = await createClient();
  const { error } = await supabase.from('employees').update({ offer_heading: headingHtml }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function updateLeaveHeading(id: string, headingHtml: string) {
  if (!id) return { error: 'Missing leave request id.' };
  const supabase = await createClient();
  const { error } = await supabase.from('leave_requests').update({ leave_heading: headingHtml }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function uploadOfferLetter(formData: FormData) {
  const supabase = await createClient();

  const employeeId = String(formData.get('employeeId') ?? '');
  const file = formData.get('file') as File | null;

  if (!employeeId || !file) return { error: 'Missing employee or file.' };

  const ext = file.name.split('.').pop();
  const path = `${employeeId}/offer-letter.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('offer-letters')
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from('offer-letters').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('employees')
    .update({ offer_letter_url: `${pub.publicUrl}?t=${Date.now()}` })
    .eq('id', employeeId);

  if (updateError) return { error: updateError.message };
  revalidatePath('/hr');
  return { error: null };
}

export async function uploadLeaveLetter(formData: FormData) {
  const supabase = await createClient();

  const leaveId = String(formData.get('leaveId') ?? '');
  const file = formData.get('file') as File | null;

  if (!leaveId || !file) return { error: 'Missing leave request or file.' };

  const ext = file.name.split('.').pop();
  const path = `${leaveId}/leave-letter.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('leave-letters')
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: pub } = supabase.storage.from('leave-letters').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ letter_url: `${pub.publicUrl}?t=${Date.now()}` })
    .eq('id', leaveId);

  if (updateError) return { error: updateError.message };
  revalidatePath('/hr');
  return { error: null };
}
