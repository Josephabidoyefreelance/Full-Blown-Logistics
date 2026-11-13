"use client";
import {useEffect,useState} from "react";
type LeaveNotice={id:string;leave_type:string;status:string;from_date:string;to_date:string};
export default function LeaveStatusNotice({requests}:{requests:LeaveNotice[]}){
 const [dismissed,setDismissed]=useState<string[]>([]);
 const latest=[...requests].find(r=>["Approved","Declined"].includes(r.status)&&!dismissed.includes(r.id));
 useEffect(()=>{if(!latest)return;const t=window.setTimeout(()=>setDismissed(old=>old.includes(latest.id)?old:[...old,latest.id]),9000);return()=>window.clearTimeout(t)},[latest?.id]);
 if(!latest)return null;const approved=latest.status==="Approved";
 return <div role="status" aria-live="polite" className={`fixed right-5 top-5 z-[200] flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-2xl ${approved?"border-green-200 bg-green-50 text-green-900":"border-red-200 bg-red-50 text-red-900"}`}>
 <div className="text-xl" aria-hidden>{approved?"✓":"!"}</div><div className="flex-1"><div className="font-semibold">{approved?"Your leave has been approved":"Your leave has been declined"}</div><p className="mt-1 text-sm">{latest.leave_type} · {latest.from_date} to {latest.to_date}</p></div><button type="button" onClick={()=>setDismissed(old=>[...old,latest.id])} className="font-bold" aria-label="Dismiss notification">×</button></div>;
}
