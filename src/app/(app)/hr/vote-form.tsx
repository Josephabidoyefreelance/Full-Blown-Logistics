'use client';

import {useState,useTransition} from 'react';
import {submitPublicVote} from './actions';

const criteria=[['appearance','Appearance'],['behavior','Behavior'],['communication','Communication'],['teamwork','Teamwork'],['reliability','Reliability'],['leadership','Leadership']] as const;
type Ratings={appearance:number;behavior:number;communication:number;teamwork:number;reliability:number;leadership:number};
const blank:Ratings={appearance:0,behavior:0,communication:0,teamwork:0,reliability:0,leadership:0};

export default function VoteForm({employeeId}:{employeeId:string}){
 const [ratings,setRatings]=useState< Ratings>(blank);const [pending,startTransition]=useTransition();const [message,setMessage]=useState('');
 const valid=Object.values(ratings).every(v=>v>=1&&v<=5);
 const submit=()=>{if(!valid)return;startTransition(async()=>{const r=await submitPublicVote(employeeId,ratings);setMessage(r.error?r.error:'Thank you. Your Employee of the Year vote has been recorded.');if(!r.error)setRatings(blank);});};
 return <div className="mt-5 border-t pt-5">
  <h3 className="text-base font-bold">Rate this employee</h3><p className="mt-1 text-xs text-neutral-500">Rate each area from 1 (poor) to 5 (excellent), then submit your vote.</p>
  <div className="mt-4 space-y-2">{criteria.map(([key,label])=><div key={key} className="rounded-xl bg-neutral-50 p-3"><div className="mb-2 text-xs font-semibold">{label}</div><div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setRatings(r=>({...r,[key]:n}))} className={`h-8 w-8 rounded-full text-xs font-bold ${ratings[key]===n?'bg-red-600 text-white':'bg-white text-neutral-600'}`}>{n}</button>)}</div></div>)}</div>
  {message&&<div className="mt-3 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-700">{message}</div>}
  <button disabled={!valid||pending} onClick={submit} className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{pending?'Submitting...':'Submit vote'}</button>
 </div>;
}
