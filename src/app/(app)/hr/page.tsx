import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import RecruitmentPipeline from './recruitment-pipeline';
import LeavePipeline from './leave-pipeline';
import EmployeeCard from './employee-card';
import NewEmployeeForm from './new-employee-form';
import NewLeaveRequestForm from './new-leave-request-form';
import NewCareerPostingForm from './new-career-posting-form';
import CareerPostingCard from './career-posting-card';
import LettersWorkspace from './letters-workspace';
import VoteButton from './vote-button';
import CopyProfileLink from './copy-profile-link';
import {syncEmployeeLeaveStatuses} from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const tabs = [
  ['employees', 'Employees'], ['recruitment', 'Recruitment'], ['careers', 'Careers postings'],
  ['leave', 'Leave'], ['employee-of-the-year', 'Employee of the year'], ['letters', 'Letters'],
] as const;

function StatCard({label,value,tone='neutral'}:{label:string;value:number;tone?:string}) {
  const tones:Record<string,string>={
    neutral:'bg-blue-50/40 border-blue-200', red:'bg-red-50/50 border-red-200',
    green:'bg-green-50/50 border-green-200', amber:'bg-amber-50/50 border-amber-200'
  };
  return <div className={`rounded-xl border p-4 ${tones[tone]??tones.neutral}`}><div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</div><div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div></div>;
}

async function signedUrl(supabase:any, path:string|null|undefined, expires=3600){
  if(!path)return null;
  const {data}=await supabase.storage.from('employee-documents').createSignedUrl(path,expires);
  return data?.signedUrl??null;
}

export default async function HRPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const params=await searchParams;
  const validViews=['employees','recruitment','careers','leave','employee-of-the-year','letters'];
  const requestedView=params.view||'employees';
  const view=validViews.includes(requestedView)?requestedView:'employees';
  const supabase=await createClient();
  await syncEmployeeLeaveStatuses();
  const employees=await supabase.from('employees').select('id,employee_id,name,department,role_title,status,votes,offer_heading,email,phone,last_residence,current_residence,city,state,date_of_birth,nationality,emergency_contact_name,emergency_contact_phone,address,lga,gender,marital_status,nin_number,passport_number,employment_date,next_of_kin_name,next_of_kin_phone,next_of_kin_address,passport_path,signature_path,id_document_path,created_at').order('name');
  const employeeRows=employees.data??[];
  const enrichedEmployees=await Promise.all(employeeRows.map(async e=>({
    ...e,
    passport_url:await signedUrl(supabase,e.passport_path),
    signature_url:await signedUrl(supabase,e.signature_path),
    id_document_url:await signedUrl(supabase,e.id_document_path),
  })));

  const applicants=view==='recruitment'?await supabase.from('applicants').select('id,posting_id,name,email,phone,location,role_applied_for,stage,cover_note,cv_url,photo_url,created_at').order('created_at',{ascending:false}):null;
  const leave=view==='leave'?await supabase.from('leave_requests').select('id,employee_id,employee_name,leave_type,from_date,to_date,status,leave_heading,letter_url,reason,requested_on').order('requested_on',{ascending:false}):null;
  const postings=view==='careers'?await supabase.from('career_postings').select('id,title,location,employment_type,description').order('created_at',{ascending:false}):null;

  const active=enrichedEmployees.filter(e=>String(e.status).toLowerCase()==='active').length;
  const onLeave=enrichedEmployees.filter(e=>String(e.status).toLowerCase().replace(/\s+/g,'')==='onleave').length;
  const inactive=enrichedEmployees.filter(e=>String(e.status).toLowerCase()==='inactive').length;
  const dbApplicants=applicants?.data??[]; const applicantRows=dbApplicants.length?dbApplicants:[{id:'demo-01',posting_id:null,name:'Demo Applicant 01',email:'demo01@example.com',phone:'0800 000 0001',location:'Lagos, Nigeria',role_applied_for:'Logistics Coordinator',stage:'Screening',cover_note:'Demo applicant for screening workflow testing.',cv_url:null,photo_url:'https://i.pravatar.cc/160?img=12',created_at:null},{id:'demo-02',posting_id:null,name:'Demo Applicant 02',email:'demo02@example.com',phone:'0800 000 0002',location:'Abuja, Nigeria',role_applied_for:'Fleet Supervisor',stage:'Interview',cover_note:'Demo applicant for interview workflow testing.',cv_url:null,photo_url:'https://i.pravatar.cc/160?img=32',created_at:null},{id:'demo-03',posting_id:null,name:'Demo Applicant 03',email:'demo03@example.com',phone:'0800 000 0003',location:'Ibadan, Nigeria',role_applied_for:'Customer Service Representative',stage:'Offer',cover_note:'Demo applicant for offer workflow testing.',cv_url:null,photo_url:'https://i.pravatar.cc/160?img=47',created_at:null},{id:'demo-04',posting_id:null,name:'Demo Applicant 04',email:'demo04@example.com',phone:'0800 000 0004',location:'Lagos, Nigeria',role_applied_for:'Operations Assistant',stage:'Hired',cover_note:'Demo applicant for hired workflow testing.',cv_url:null,photo_url:'https://i.pravatar.cc/160?img=68',created_at:null}];
  const screening=applicantRows.filter(a=>a.stage==='Screening').length;
  const interview=applicantRows.filter(a=>a.stage==='Interview').length;
  const offer=applicantRows.filter(a=>a.stage==='Offer').length;
  const hired=applicantRows.filter(a=>a.stage==='Hired').length;
  const leaveRows=leave?.data??[];
  const awaiting=leaveRows.filter(l=>['Requested','Awaiting Approval','Pending'].includes(l.status)).length;
  const approved=leaveRows.filter(l=>l.status==='Approved').length;
  const declined=leaveRows.filter(l=>['Declined','Rejected'].includes(l.status)).length;

  return <div className="jaad-hr-page">
    <style>{`
      /* HR-only containment: remove any accidentally nested ERP shell at any depth.
         The real application sidebar lives outside .jaad-hr-page and is untouched. */
      .jaad-hr-page .flex.h-screen.overflow-hidden { display: contents !important; height: auto !important; min-height: 0 !important; overflow: visible !important; background: transparent !important; }
      .jaad-hr-page .flex.h-screen.overflow-hidden aside { display: none !important; }
      .jaad-hr-page .flex.h-screen.overflow-hidden header { display: none !important; }
      .jaad-hr-page .flex.h-screen.overflow-hidden > div,
      .jaad-hr-page .flex.h-screen.overflow-hidden div:has(> header) { display: contents !important; min-width: 0 !important; width: auto !important; }
      .jaad-hr-page .flex.h-screen.overflow-hidden main { display: contents !important; min-height: 0 !important; height: auto !important; overflow: visible !important; padding: 0 !important; }
    `}</style>
    <div className="mb-5 flex items-start justify-between"><div><h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">HR &amp; Careers</h1><p className="text-sm text-neutral-500 dark:text-neutral-400">Manage employees, hiring, careers, leave and recognition.</p></div>{view==='employees'&&<NewEmployeeForm/>}{view==='careers'&&<NewCareerPostingForm/>}{view==='leave'&&<NewLeaveRequestForm employees={enrichedEmployees.map(e=>({id:e.id,name:e.name}))}/>}</div>
    <div className="mb-4 flex flex-wrap gap-5 border-b border-neutral-200 text-sm font-semibold dark:border-neutral-800">{tabs.map(([key,label])=><Link key={key} href={`/hr?view=${key}`} className={`pb-2 ${view===key?'border-b-2 border-red-600 text-neutral-900 dark:text-neutral-100':'text-neutral-500 dark:text-neutral-400'}`}>{label}</Link>)}</div>

    {view==='employees'&&<div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Total employees" value={enrichedEmployees.length} tone="neutral"/><StatCard label="Active" value={active} tone="green"/><StatCard label="On leave" value={onLeave} tone="amber"/><StatCard label="Inactive" value={inactive} tone="red"/></div><div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><div className="mb-3"><h2 className="text-sm font-semibold">Employee database</h2><p className="text-[11px] text-neutral-500">Hover for a quick preview. Click the employee name to open the normal-size profile card, documents and print/download view.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{enrichedEmployees.map(e=><EmployeeCard key={e.id} employee={e}/>)}{!enrichedEmployees.length&&<div className="py-10 text-center text-sm text-neutral-400 md:col-span-2 xl:col-span-3">No employees yet.</div>}</div></div></div>}

    {view==='recruitment'&&<div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><StatCard label="Total applicants" value={applicantRows.length} tone="red"/><StatCard label="Screening" value={screening}/><StatCard label="Interview" value={interview} tone="amber"/><StatCard label="Offer" value={offer}/><StatCard label="Hired" value={hired} tone="green"/></div><RecruitmentPipeline applicants={applicantRows}/></div>}

    {view==='careers'&&<div className="space-y-3"><div className="rounded-lg bg-neutral-100 p-3 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">Every posting has a real public URL. Anyone with the link can open the vacancy and apply without first visiting the ERP.</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(postings?.data??[]).map(p=><CareerPostingCard key={p.id} posting={p}/>)}{!postings?.data?.length&&<div className="rounded-xl border border-neutral-200 bg-white px-5 py-10 text-center text-neutral-400 md:col-span-2 xl:col-span-3">No roles posted yet.</div>}</div></div>}

    {view==='leave'&&<div className="space-y-4"><div className="grid grid-cols-3 gap-3"><StatCard label="Awaiting approval" value={awaiting} tone="amber"/><StatCard label="Approved" value={approved} tone="green"/><StatCard label="Declined" value={declined} tone="red"/></div><LeavePipeline leaves={leaveRows??[]}/></div>}

    {view==='letters'&&<LettersWorkspace employees={enrichedEmployees.map(e=>({id:e.id,name:e.name,department:e.department,role_title:e.role_title,email:e.email,phone:e.phone,employee_id:e.employee_id}))}/>}

    {view==='employee-of-the-year'&&<div className="space-y-4"><div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><h2 className="text-base font-semibold">Employee of the Year</h2><p className="mt-1 text-xs text-neutral-500">Rate each employee from 1–5 stars. Open the public recognition profile to share their recognition page.</p><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...enrichedEmployees].sort((a,b)=>(b.votes??0)-(a.votes??0)).map(e=><div key={e.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"><div className="flex items-center gap-3">{e.passport_url?<img src={e.passport_url} alt="" className="h-12 w-12 rounded-xl object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 font-semibold text-neutral-500">{e.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('')}</div>}<div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{e.name}</div><div className="text-[11px] text-neutral-500">{e.department} · {e.role_title}</div></div><div className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{e.votes??0} votes</div></div><div className="mt-4 flex items-center gap-3"><Link href={`/employee-of-the-year/${e.id}`} target="_blank" className="text-xs font-semibold text-red-700 hover:underline">Public profile</Link><CopyProfileLink employeeId={e.id}/><VoteButton id={e.id}/></div></div>)}</div></div></div>}
  </div>;
}
