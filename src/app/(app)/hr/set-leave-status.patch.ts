/**
 * Merge this logic into the existing setLeaveStatus server action in
 * src/app/(app)/hr/actions.ts. Keep your other existing actions unchanged.
 *
 * Expected status values used by the leave board: Pending, Awaiting Approval,
 * Approved, Declined. This intentionally matches employees by name because the
 * current leave_requests records store employee_name rather than employee_id.
 */
export async function setLeaveStatus(id: string, status: string) {
  const allowed = ['Pending', 'Awaiting Approval', 'Approved', 'Declined'];
  if (!id || !allowed.includes(status)) return { error: 'Invalid leave status.' };

  const supabase = await createClient();
  const { data: leave, error: readError } = await supabase
    .from('leave_requests')
    .select('id, employee_name, status, to_date')
    .eq('id', id)
    .single();
  if (readError || !leave) return { error: readError?.message ?? 'Leave request not found.' };

  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status })
    .eq('id', id);
  if (updateError) return { error: updateError.message };

  // Approval immediately marks the staff member as on leave in the Employees tab.
  if (status === 'Approved') {
    const { error } = await supabase
      .from('employees')
      .update({ status: 'On Leave' })
      .ilike('name', leave.employee_name);
    if (error) return { error: `Leave was approved, but employee status could not be updated: ${error.message}` };
  } else if (leave.status === 'Approved') {
    // If this approved leave is changed to another stage, retain On Leave only
    // when another approved leave exists for this employee and has not ended.
    const today = new Date().toISOString().slice(0, 10);
    const { data: otherLeaves, error } = await supabase
      .from('leave_requests')
      .select('id, to_date')
      .ilike('employee_name', leave.employee_name)
      .eq('status', 'Approved')
      .neq('id', id)
      .gte('to_date', today);
    if (error) return { error: error.message };
    const nextStatus = otherLeaves?.length ? 'On Leave' : 'Active';
    const { error: employeeError } = await supabase
      .from('employees')
      .update({ status: nextStatus })
      .ilike('name', leave.employee_name);
    if (employeeError) return { error: employeeError.message };
  }

  revalidatePath('/hr');
  revalidatePath('/dashboard');
  return { error: null };
}
