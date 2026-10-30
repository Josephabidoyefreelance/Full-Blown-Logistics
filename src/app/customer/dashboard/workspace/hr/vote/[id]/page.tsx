import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { submitPublicVote as voteEmployeePublic } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployeeOfTheYearPublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, name, department, role_title, status, votes')
    .eq('id', id)
    .maybeSingle();

  if (error || !employee) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-900">
        <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Profile unavailable</h1>
          <p className="mt-2 text-sm text-neutral-600">This employee profile could not be found. Please check the link or contact JAAD HR.</p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Return to JAAD</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 text-neutral-900">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
        <div className="bg-neutral-950 px-8 py-7 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JAAD Logistics" className="mb-5 h-12 w-12 rounded bg-white object-contain p-1" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">JAAD Logistics · Recognition</p>
          <h1 className="mt-2 text-2xl font-bold">Employee of the Year</h1>
          <p className="mt-1 text-sm text-neutral-300">Public employee profile and recognition vote</p>
        </div>
        <div className="p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl font-bold text-red-700">
            {employee.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join('')}
          </div>
          <h2 className="mt-4 text-2xl font-bold">{employee.name}</h2>
          <p className="mt-1 text-sm text-neutral-600">{employee.role_title || 'JAAD team member'}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Department</p>
              <p className="mt-1 font-semibold">{employee.department || 'Not specified'}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Current votes</p>
              <p className="mt-1 text-2xl font-bold">{employee.votes ?? 0}</p>
            </div>
          </div>
          <form action={voteEmployeePublic.bind(null, employee.id)} className="mt-6">
            <button type="submit" className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700">Vote for {employee.name.split(' ')[0]}</button>
          </form>
          <p className="mt-3 text-center text-xs text-neutral-500">Please vote fairly and respectfully. Votes are recorded by JAAD Logistics.</p>
        </div>
      </section>
    </main>
  );
}
