'use client';

import {useState,useTransition} from 'react';
import {submitApplication} from './actions';

export default function ApplicationForm({posting}:{posting:any}){
 const [pending,startTransition]=useTransition();const [message,setMessage]=useState('');
 return <form action={fd=>startTransition(async()=>{setMessage('');const r=await submitApplication(fd);setMessage(r.error?r.error:'Application submitted successfully.');})} className="mt-5 space-y-3">
  <input type="hidden" name="role_applied_for" value={posting.title}/>
  <input name="name" required placeholder="Full name" className="w-full rounded-lg border px-3 py-2 text-sm"/>
  <div className="grid grid-cols-2 gap-3"><input name="email" required type="email" placeholder="Email address" className="rounded-lg border px-3 py-2 text-sm"/><input name="phone" required placeholder="Phone number" className="rounded-lg border px-3 py-2 text-sm"/></div>
  <input name="linkedin" placeholder="LinkedIn profile (optional)" className="w-full rounded-lg border px-3 py-2 text-sm"/>
  <textarea name="skills" required rows={3} placeholder="Skills (e.g. Excel, SAP, inventory management, route planning)" className="w-full rounded-lg border px-3 py-2 text-sm leading-6"/>
  <input name="location" placeholder="Location" className="w-full rounded-lg border px-3 py-2 text-sm"/>
  <textarea name="cover_letter" required rows={8} placeholder="Cover letter" className="w-full rounded-lg border px-3 py-2 text-sm leading-6"/>
  {message&&<div className={`rounded-lg p-3 text-xs ${message.startsWith('Application submitted')?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{message}</div>}
  <button disabled={pending} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white">{pending?'Submitting...':'Submit application'}</button>
 </form>
}
