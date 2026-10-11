/**
 * Add this helper to the HR server page (or a server-only helper module) and
 * call await syncEmployeesReturnedFromLeave(supabase) before loading employees.
 * It returns staff to Active once their approved leave end date has passed.
 * No external cron service is required; it runs whenever the HR page is opened.
 */
export async function syncEmployeesReturnedFromLeave(supabase: any) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: endedLeaves, error } = await supabase
    .from('leave_requests')
    .select('employee_name')
    .eq('status', 'Approved')
    .lt('to_date', today);
  if (error) throw new Error(`Could not check ended leave: ${error.message}`);

  const names = [...new Set((endedLeaves ?? []).map((row: { employee_name: string }) => row.employee_name).filter(Boolean))];
  for (const name of names) {
    const { data: ongoing, error: ongoingError } = await supabase
      .from('leave_requests')
      .select('id')
      .ilike('employee_name', name)
      .eq('status', 'Approved')
      .gte('to_date', today)
      .limit(1);
    if (ongoingError) throw new Error(`Could not check active leave for ${name}: ${ongoingError.message}`);
    if (!ongoing?.length) {
      const { error: employeeError } = await supabase
        .from('employees')
        .update({ status: 'Active' })
        .ilike('name', name)
        .eq('status', 'On Leave');
      if (employeeError) throw new Error(`Could not reactivate ${name}: ${employeeError.message}`);
    }
  }
}
