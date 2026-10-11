'use client';

import { useState, useTransition } from 'react';
import { submitEmployeeLeave } from './actions';

type Props = { employeeId: string; employeeName: string };

export default function EmployeePortalLeaveForm({ employeeId, employeeName }: Props) {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitEmployeeLeave(formData);
      setMessage(result?.error ? result.error : 'Leave request submitted successfully.');
      if (!result?.error) {
        const form = document.getElementById('employee-leave-form') as HTMLFormElement | null;
        form?.reset();
      }
    });
  }

  return (
    <form id="employee-leave-form" action={submit} className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Request leave</h2>
      <input type="hidden" name="employee_id" value={employeeId} />
      <input type="hidden" name="employee_name" value={employeeName} />
      <label className="mt-4 block text-sm font-medium">Leave type
        <select name="leave_type" required className="mt-1 w-full rounded-lg border p-2">
          <option value="">Select leave type</option>
          <option value="Annual Leave">Annual Leave</option>
          <option value="Sick Leave">Sick Leave</option>
          <option value="Casual Leave">Casual Leave</option>
          <option value="Maternity Leave">Maternity Leave</option>
          <option value="Paternity Leave">Paternity Leave</option>
          <option value="Unpaid Leave">Unpaid Leave</option>
        </select>
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">From
          <input name="from_date" type="date" required className="mt-1 w-full rounded-lg border p-2" />
        </label>
        <label className="block text-sm font-medium">To
          <input name="to_date" type="date" required className="mt-1 w-full rounded-lg border p-2" />
        </label>
      </div>
      <label className="mt-3 block text-sm font-medium">Reason (optional)
        <textarea name="reason" rows={3} className="mt-1 w-full rounded-lg border p-2" />
      </label>
      {message && <p role="status" className="mt-3 text-sm text-neutral-700">{message}</p>}
      <button disabled={isPending} type="submit" className="mt-4 w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {isPending ? 'Submitting…' : 'Submit leave request'}
      </button>
    </form>
  );
}
