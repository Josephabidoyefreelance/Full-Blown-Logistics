'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function submitCareerApplication(fd:FormData){
 const db=await createClient();
 const postingId=String(fd.get('posting_id')||'').trim();
 const name=String(fd.get('name')||'').trim();
 const email=String(fd.get('email')||'').trim();
 const phone=String(fd.get('phone')||'').trim();
 if(!postingId||!name||!email||!phone)return {error:'Name, email, phone and job are required.'};
 const file=fd.get('cv');
 let cvPath:string|null=null;
 if(file instanceof File && file.size>0){
  if(file.size>5*1024*1024)return {error:'CV must be 5MB or smaller.'};
  const ext=file.name.split('.').pop()?.toLowerCase();
  const mime:Record<string,string>={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  if(!ext||!mime[ext])return {error:'CV must be PDF, DOC or DOCX.'};
  cvPath=`incoming/${postingId}/${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from('applicant-cvs').upload(cvPath,file,{upsert:false,contentType:mime[ext]});
  if(error)return {error:'CV upload failed: '+error.message};
 }
 const {error}=await db.rpc('jaad_submit_career_application',{
  p_posting_id:postingId,p_name:name,p_email:email,p_phone:phone,
  p_location:String(fd.get('location')||'').trim(),
  p_cover_note:String(fd.get('cover_note')||'').trim(),
  p_cv_path:cvPath,
 });
 if(error)return {error:error.message};
 revalidatePath('/customer/dashboard/workspace/hr');return {error:null};
}
export const submitApplication=submitCareerApplication;
