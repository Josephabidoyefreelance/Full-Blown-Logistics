import { createClient } from '@/lib/supabase/server';
import VoteButtonPublic from './vote-button-public';

export default async function VoteForEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, department, role_title, votes')
    .eq('id', id)
    .single();

  if (!employee) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="text-center text-neutral-500">This employee could not be found.</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between bg-black px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JAAD Logistics" className="h-10 w-10 rounded" />
          <div className="text-lg font-bold tracking-wide text-white">EMPLOYEE OF THE YEAR</div>
        </div>

        <div className="p-6 text-center">
          <h1 className="mb-1 text-xl font-bold text-neutral-900">{employee.name}</h1>
          <div className="mb-6 text-sm text-neutral-500">
            {employee.role_title} &middot; {employee.department}
          </div>

          <VoteButtonPublic employeeId={employee.id} />
        </div>
      </div>
    </div>
  );
}
