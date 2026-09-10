import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import StageSwitch from './stage-switch';
import LeaveActions from './leave-actions';
import NewEmployeeForm from './new-employee-form';
import NewLeaveRequestForm from './new-leave-request-form';
import NewCareerPostingForm from './new-career-posting-form';
import CareerPostingCard from './career-posting-pdf-modal';
import VoteButton from './vote-button';
import OfferLetterModal from './offer-letter-modal';
import LeaveLetterModal from './leave-letter-modal';

const EMPLOYEE_COLS = 'grid-cols-[220px_180px_220px_180px_140px]';
const RECRUIT_COLS = 'grid-cols-[220px_260px_160px]';
const LEAVE_COLS = 'grid-cols-[200px_130px_150px_150px_140px_220px]';
const VOTE_COLS = 'grid-cols-[260px_200px_120px_240px]';

export default async function HRPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = 'employees' } = await searchParams;
  const supabase = await createClient();

  const employees =
    view === 'employees' || view === 'employee-of-the-year'
      ? await supabase
          .from('employees')
          .select('id, name, department, role_title, status, votes, offer_heading')
          .order('name')
      : null;

  const applicants =
    view === 'recruitment'
      ? await supabase
          .from('applicants')
          .select('id, name, role_applied_for, stage')
          .order('created_at', { ascending: false })
      : null;

  const leave =
    view === 'leave'
      ? await supabase
          .from('leave_requests')
          .select('id, employee_name, leave_type, from_date, to_date, status, leave_heading')
          .order('requested_on', { ascending: false })
      : null;

  const postings =
    view === 'careers'
      ? await supabase
          .from('career_postings')
          .select('id, title, location, employment_type, description')
          .order('created_at', { ascending: false })
      : null;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">HR &amp; Careers</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Employees, recruitment, careers postings and leave.
          </p>
        </div>
        {(view === 'employees' || view === 'employee-of-the-year') && <NewEmployeeForm />}
        {view === 'careers' && <NewCareerPostingForm />}
        {view === 'leave' && <NewLeaveRequestForm />}
      </div>

      <div className="mb-4 flex gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">
        <a href="/hr?view=employees" className={`pb-2 ${view === 'employees' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Employees</a>
        <a href="/hr?view=recruitment" className={`pb-2 ${view === 'recruitment' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Recruitment</a>
        <a href="/hr?view=careers" className={`pb-2 ${view === 'careers' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Careers postings</a>
        <a href="/hr?view=leave" className={`pb-2 ${view === 'leave' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Leave</a>
        <a href="/hr?view=employee-of-the-year" className={`pb-2 ${view === 'employee-of-the-year' ? 'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}>Employee of the year</a>
      </div>

      {view === 'employees' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[900px]">
            <div className={`grid ${EMPLOYEE_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
              <div>Name</div>
              <div>Department</div>
              <div>Role</div>
              <div>Offer letter</div>
              <div className="text-right">Status</div>
            </div>
            {(employees?.data ?? []).map((e) => (
              <div key={e.id} className={`grid ${EMPLOYEE_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{e.name}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{e.department}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{e.role_title}</div>
                <div><OfferLetterModal id={e.id} name={e.name} department={e.department} roleTitle={e.role_title} offerHeading={e.offer_heading} /></div>
                <div className="flex justify-end">
                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-600">
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
            {!employees?.data?.length && (
              <div className="px-5 py-8 text-center text-neutral-400">No employees yet.</div>
            )}
          </div>
        </div>
      )}

      {view === 'recruitment' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[700px]">
            <div className={`grid ${RECRUIT_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
              <div>Applicant</div>
              <div>Role applied for</div>
              <div className="text-right">Stage</div>
            </div>
            {(applicants?.data ?? []).map((a) => (
              <div key={a.id} className={`grid ${RECRUIT_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{a.name}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{a.role_applied_for}</div>
                <div className="flex justify-end"><StageSwitch id={a.id} stage={a.stage} /></div>
              </div>
            ))}
            {!applicants?.data?.length && (
              <div className="px-5 py-8 text-center text-neutral-400">No applicants yet.</div>
            )}
          </div>
        </div>
      )}

      {view === 'careers' && (
        <div>
          <p className="mb-4 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            Anything posted here appears live on the public website&apos;s Careers section.
          </p>
          <div className="space-y-3">
            {(postings?.data ?? []).map((p) => (
              <CareerPostingCard
                key={p.id}
                id={p.id}
                title={p.title}
                location={p.location}
                employmentType={p.employment_type}
                description={p.description}
              />
            ))}
            {!postings?.data?.length && (
              <div className="rounded-xl border border-neutral-200 bg-white px-5 py-8 text-center text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
                No roles posted yet.
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'leave' && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-[1000px]">
            <div className={`grid ${LEAVE_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
              <div>Employee</div>
              <div>Type</div>
              <div>From</div>
              <div>To</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>
            {(leave?.data ?? []).map((l) => (
              <div key={l.id} className={`grid ${LEAVE_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{l.employee_name}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{l.leave_type}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{l.from_date}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{l.to_date}</div>
                <div className="truncate text-neutral-700 dark:text-neutral-300">{l.status}</div>
                <div className="flex items-center justify-end gap-2">
                  <LeaveActions id={l.id} status={l.status} />
                  {l.status === 'Approved' && (
                    <LeaveLetterModal
                      id={l.id}
                      employeeName={l.employee_name}
                      leaveType={l.leave_type}
                      fromDate={l.from_date}
                      toDate={l.to_date}
                      leaveHeading={l.leave_heading}
                    />
                  )}
                </div>
              </div>
            ))}
            {!leave?.data?.length && (
              <div className="px-5 py-8 text-center text-neutral-400">No leave requests yet.</div>
            )}
          </div>
        </div>
      )}

      {view === 'employee-of-the-year' && (
        <div>
          <p className="mb-4 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            Anyone on the admin team can cast one vote per person. Most votes wins for the month.
          </p>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-[820px]">
              <div className={`grid ${VOTE_COLS} items-center justify-between bg-neutral-50 px-5 py-3 text-[11px] uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400`}>
                <div>Employee</div>
                <div>Department</div>
                <div className="text-right">Votes</div>
                <div className="text-right">Action</div>
              </div>
              {(employees?.data ?? []).map((e) => (
                <div key={e.id} className={`grid ${VOTE_COLS} items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm dark:border-neutral-800`}>
                  <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{e.name}</div>
                  <div className="truncate text-neutral-700 dark:text-neutral-300">{e.department}</div>
                  <div className="text-right text-neutral-700 dark:text-neutral-300">{e.votes ?? 0}</div>
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/vote/${e.id}`} target="_blank" className="text-xs font-medium text-red-700 hover:underline dark:text-red-500">
                      Public link
                    </Link>
                    <VoteButton id={e.id} votes={e.votes ?? 0} />
                  </div>
                </div>
              ))}
              {!employees?.data?.length && (
                <div className="px-5 py-8 text-center text-neutral-400">No employees yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
