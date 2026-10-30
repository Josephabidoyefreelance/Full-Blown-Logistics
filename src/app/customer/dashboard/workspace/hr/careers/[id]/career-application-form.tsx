'use client';
import {useRef,useState,useTransition} from 'react';
import {submitCareerApplication} from './actions';
export default function CareerApplicationForm({jobId,jobTitle}:{jobId:string;jobTitle:string}){
 const [pending,start]=useTransition();const [error,setError]=useState<string|null>(null);const [done,setDone]=useState(false);const ref=useRef<HTMLFormElement>(null);
 if(done)return <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-800"><b>Application received.</b><br/>Thank you for applying for {jobTitle}. HR & Careers will review your application.</div>;
 return <form ref={ref} className="rounded-xl border border-neutral-200 p-5" action={(fd)=>{setError(null);start(async()=>{const r=await submitCareerApplication(fd);if(r?.error){setError(r.error);return;}setDone(true);ref.current?.reset();});}}>
  <h2 className="mb-4 text-lg font-semibold">Apply for this role</h2>{error&&<p className="mb-3 text-sm text-red-600">{error}</p>}
  <input type="hidden" name="posting_id" value={jobId}/><input type="hidden" name="role_applied_for" value={jobTitle}/>
  <div className="space-y-3">
   <input name="name" required placeholder="Full name" className="w-full rounded-lg border px-3 py-2 text-sm"/>
   <input name="email" required type="email" placeholder="Email address" className="w-full rounded-lg border px-3 py-2 text-sm"/>
   <input name="phone" required placeholder="Phone number" className="w-full rounded-lg border px-3 py-2 text-sm"/>
   <input name="location" placeholder="City / State" className="w-full rounded-lg border px-3 py-2 text-sm"/>
   <div><label className="mb-1 block text-xs font-medium text-neutral-500">CV / Resume (PDF, DOC or DOCX)</label><input name="cv" required type="file" accept=".pdf,.doc,.docx" className="w-full text-sm"/></div>
   <textarea name="cover_note" rows={5} placeholder="Cover note (optional)" className="w-full rounded-lg border px-3 py-2 text-sm"/>
   <button disabled={pending} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending?'Submitting...':'Submit application'}</button>
  </div>
 </form>;
}
