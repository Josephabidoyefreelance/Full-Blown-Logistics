'use client';
import {useState} from 'react';
export default function LeaveLetterModal({id,employeeName,leaveType,fromDate,toDate,leaveHeading}:{id:string;employeeName:string;leaveType:string;fromDate:string;toDate:string;leaveHeading?:string|null}){
 const [open,setOpen]=useState(false);
 return <><button type="button" onClick={()=>setOpen(true)} className="text-xs font-semibold text-red-600 hover:underline">Leave letter</button>{open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 text-neutral-900"><h2 className="text-lg font-bold">{leaveHeading||'Approved leave'}</h2><p className="mt-4">Employee: {employeeName}</p><p>Leave type: {leaveType}</p><p>From: {fromDate}</p><p>To: {toDate}</p><div className="mt-6 flex gap-3"><button type="button" onClick={()=>window.print()} className="rounded bg-red-600 px-4 py-2 text-white">Print</button><button type="button" onClick={()=>setOpen(false)} className="rounded border px-4 py-2">Close</button></div></div></div>}</>;
}
