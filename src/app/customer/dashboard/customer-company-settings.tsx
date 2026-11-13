'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CustomerCompanySettings() {
 const [open,setOpen]=useState(false);
 const [name,setName]=useState('');
 const [logo,setLogo]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [ownerId,setOwnerId]=useState<string|null>(null);
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{let live=true; (async()=>{
   const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user||!live)return;
   const {data}=await db.from('customers').select('id,name,logo_url').eq('user_id',user.id).maybeSingle();
   if(live&&data){setOwnerId(data.id);setName(data.name||'');setLogo(data.logo_url||null);}
 })();return()=>{live=false}},[]);
 async function upload(file?:File){if(!file||!ownerId)return;
   setMessage('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setMessage('Use PNG, JPEG or WebP.');return;}
   if(file.size>2*1024*1024){setMessage('Logo must be 2 MB or smaller.');return;}
   setBusy(true);try{
    const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('Please sign in again.');
    // Customer-record UUID folder; never use the auth-user UUID as a logo folder.
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`${ownerId}/${crypto.randomUUID()}.${ext}`;
    const {error:e}=await db.storage.from('logos').upload(path,file,{upsert:false,contentType:file.type});if(e)throw e;
    const url=db.storage.from('logos').getPublicUrl(path).data.publicUrl;
    const {data:updated,error:u}=await db.from('customers').update({logo_url:url}).eq('id',ownerId).eq('user_id',user.id).select('id').maybeSingle();
    if(u||!updated){await db.storage.from('logos').remove([path]);throw new Error(u?.message||'Company record update was denied by RLS.');}
    setLogo(url);setMessage('Logo saved. Refresh to see it in the sidebar.');
   }catch(e){setMessage(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);if(input.current)input.current.value='';}
 }
 return <>
  {/* Removed redundant dashboard button. Workspace settings remain accessible through the existing profile interface. */}
  {open&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Company settings">
   <div className="w-full max-w-lg rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-white shadow-2xl">
    <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Company profile & logo</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Close">✕</button></div>
    <p className="mt-2 text-sm text-neutral-400">{name||'Company workspace'}</p>
    {logo&&<img src={logo} alt="Company logo" className="mt-4 h-20 w-20 rounded-lg bg-white object-contain p-1"/>}
    {!ownerId&&<p className="mt-3 text-sm text-amber-300">Only the company owner can upload the company logo.</p>}
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" disabled={!ownerId||busy} onChange={e=>void upload(e.target.files?.[0])} className="mt-5 block w-full text-sm" />
    <p className="mt-2 text-xs text-neutral-400">PNG, JPEG or WebP. Maximum 2 MB.</p>
    {message&&<p role="status" className="mt-3 break-words text-sm text-amber-200">{message}</p>}
    <div className="mt-5 text-right"><button type="button" onClick={()=>setOpen(false)} className="rounded-md border border-neutral-600 px-4 py-2 text-sm">Close</button></div>
   </div>
  </div>}
 </>;
}
