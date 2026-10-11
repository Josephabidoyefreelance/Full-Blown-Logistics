'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voteEmployee } from '@/app/(app)/hr/actions';
export default function PublicVoteButton({id}:{id:string}){const [pending,start]=useTransition();const router=useRouter();return <button disabled={pending} onClick={()=>start(async()=>{const r=await voteEmployee(id);if(r?.error)alert(r.error);else router.refresh();})} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{pending?'Recording vote…':'Vote for this employee'}</button>}
