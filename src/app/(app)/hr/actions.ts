'use server';
import {createClient} from '@/lib/supabase/server'; import {revalidatePath} from 'next/cache';
const APPLICANT_STAGES=['Screening','Interview','Offer','Hired']; const LEAVE_STAGES=['Pending','Awaiting Approval','Approved','Declined']; const BUCKET='employee-documents'; const PUBLIC_BUCKET='employee-public';
async function uploadFile(supabase:any,file:File|undefined,folder:string){if(!file||file.size===0)return null;if(file.size>8*1024*1024)throw new Error('Files must be 8MB or smaller.');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${folder}/${crypto.randomUUID()}-${safe}`;const {error}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(error)throw new Error(error.message);return path;}
export async function updateApplicantStage(id:string,stage:string){if(!id||!APPLICANT_STAGES.includes(stage))return{error:'Invalid applicant stage.'};const s=await createClient();const{error}=await s.from('applicants').update({stage}).eq('id',id);if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}
export async function setLeaveStatus(id:string,status:string){
  if(!id||!LEAVE_STAGES.includes(status))return{error:'Invalid leave status.'};
  const s=await createClient();
  const {data:leave,error:readError}=await s.from('leave_requests').select('employee_id,from_date,to_date').eq('id',id).maybeSingle();
  if(readError)return{error:readError.message};
  const {error}=await s.from('leave_requests').update({status}).eq('id',id);
  if(error)return{error:error.message.includes('check constraint')||error.message.includes('violates check constraint')?'The database does not yet allow this leave status. Run the included SQL migration, then try again.':error.message};
  if(leave?.employee_id){
    if(status==='Approved'){
      await s.from('employees').update({status:'On Leave'}).eq('id',leave.employee_id);
    } else if(status==='Declined'){
      await s.from('employees').update({status:'Active'}).eq('id',leave.employee_id);
    }
  }
  revalidatePath('/hr');revalidatePath('/employee-portal');return{error:null,message:`Leave request moved to ${status}.`};
}

export async function syncEmployeeLeaveStatuses(){
  const s=await createClient();
  const today=new Date().toISOString().slice(0,10);
  const {data:approved}=await s.from('leave_requests').select('employee_id,from_date,to_date').eq('status','Approved').not('employee_id','is',null);
  for(const l of approved??[]){
    if(l.employee_id && l.from_date<=today && l.to_date>=today) await s.from('employees').update({status:'On Leave'}).eq('id',l.employee_id);
    if(l.employee_id && l.to_date<today) await s.from('employees').update({status:'Active'}).eq('id',l.employee_id).eq('status','On Leave');
  }
}

export async function createEmployee(fd:FormData){try{const s=await createClient();const name=String(fd.get('name')||'').trim();const department=String(fd.get('department')||'').trim();const role_title=String(fd.get('role_title')||'').trim();if(!name||!department||!role_title)return{error:'Full name, department and role are required.'};const passport_path=await uploadFile(s,fd.get('passport') as File,'employees/passport');const signature_path=await uploadFile(s,fd.get('signature') as File,'employees/signatures');const id_document_path=await uploadFile(s,fd.get('id_document') as File,'employees/ids');const suppliedEmployeeId=String(fd.get('employee_id')||'').trim(); const initials=name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase(); const {count}=await s.from('employees').select('id',{count:'exact',head:true}); const now=new Date(); const generated=`JAAD/${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}/${String((count||0)+1).padStart(3,'0')}`; const employee_id=suppliedEmployeeId||generated;const payload={employee_id,name,department,role_title,status:String(fd.get('status')||'Active'),email:String(fd.get('email')||'').trim()||null,phone:String(fd.get('phone')||'').trim()||null,last_residence:String(fd.get('last_residence')||'').trim()||null,current_residence:String(fd.get('current_residence')||'').trim()||null,city:String(fd.get('city')||'').trim()||null,state:String(fd.get('state')||'').trim()||null,date_of_birth:String(fd.get('date_of_birth')||'').trim()||null,nationality:String(fd.get('nationality')||'').trim()||null,emergency_contact_name:String(fd.get('emergency_contact_name')||'').trim()||null,emergency_contact_phone:String(fd.get('emergency_contact_phone')||'').trim()||null,address:String(fd.get('address')||'').trim()||null,lga:String(fd.get('lga')||'').trim()||null,gender:String(fd.get('gender')||'').trim()||null,marital_status:String(fd.get('marital_status')||'').trim()||null,nin_number:String(fd.get('nin_number')||'').trim()||null,passport_number:String(fd.get('passport_number')||'').trim()||null,employment_date:String(fd.get('employment_date')||'').trim()||null,next_of_kin_name:String(fd.get('next_of_kin_name')||'').trim()||null,next_of_kin_phone:String(fd.get('next_of_kin_phone')||'').trim()||null,next_of_kin_address:String(fd.get('next_of_kin_address')||'').trim()||null,passport_path,signature_path,id_document_path};const{error}=await s.from('employees').insert(payload);if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}catch(e:any){return{error:e?.message||'Unable to save employee.'}}}
export async function updateEmployee(id:string,fd:FormData){
  try{
    const s=await createClient();
    if(!id)return{error:'Employee ID is required.'};
    const existing=await s.from('employees').select('passport_path,signature_path,id_document_path').eq('id',id).maybeSingle();
    const passport_path=await uploadFile(s,fd.get('passport') as File,'employees/passport')||existing.data?.passport_path||null;
    const signature_path=await uploadFile(s,fd.get('signature') as File,'employees/signatures')||existing.data?.signature_path||null;
    const id_document_path=await uploadFile(s,fd.get('id_document') as File,'employees/ids')||existing.data?.id_document_path||null;
    const payload:any={name:String(fd.get('name')||'').trim(),department:String(fd.get('department')||'').trim(),role_title:String(fd.get('role_title')||'').trim(),email:String(fd.get('email')||'').trim()||null,phone:String(fd.get('phone')||'').trim()||null,address:String(fd.get('address')||'').trim()||null,last_residence:String(fd.get('last_residence')||'').trim()||null,current_residence:String(fd.get('current_residence')||'').trim()||null,city:String(fd.get('city')||'').trim()||null,state:String(fd.get('state')||'').trim()||null,lga:String(fd.get('lga')||'').trim()||null,date_of_birth:String(fd.get('date_of_birth')||'').trim()||null,gender:String(fd.get('gender')||'').trim()||null,marital_status:String(fd.get('marital_status')||'').trim()||null,nationality:String(fd.get('nationality')||'').trim()||null,nin_number:String(fd.get('nin_number')||'').trim()||null,passport_number:String(fd.get('passport_number')||'').trim()||null,employment_date:String(fd.get('employment_date')||'').trim()||null,next_of_kin_name:String(fd.get('next_of_kin_name')||'').trim()||null,next_of_kin_phone:String(fd.get('next_of_kin_phone')||'').trim()||null,next_of_kin_address:String(fd.get('next_of_kin_address')||'').trim()||null,emergency_contact_name:String(fd.get('emergency_contact_name')||'').trim()||null,emergency_contact_phone:String(fd.get('emergency_contact_phone')||'').trim()||null,passport_path,signature_path,id_document_path};
    const {error}=await s.from('employees').update(payload).eq('id',id); if(error)return{error:error.message}; revalidatePath('/hr'); return{error:null};
  }catch(e:any){return{error:e?.message||'Unable to update employee.'}}
}

export async function createLeaveRequest(fd:FormData){const s=await createClient();const employee_name=String(fd.get('employee_name')||'').trim();const employee_id=String(fd.get('employee_id')||'').trim()||null;const leave_type=String(fd.get('leave_type')||'').trim();const from_date=String(fd.get('from_date')||'').trim();const to_date=String(fd.get('to_date')||'').trim();const reason=String(fd.get('reason')||'').trim()||null;if(!employee_name||!leave_type||!from_date||!to_date)return{error:'Employee, type and dates are required.'};const{error}=await s.from('leave_requests').insert({employee_id,employee_name,leave_type,from_date,to_date,status:'Pending',reason});if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}
export async function createCareerPosting(fd:FormData){const s=await createClient();const title=String(fd.get('title')||'').trim();const location=String(fd.get('location')||'Lagos, Nigeria').trim();const employment_type=String(fd.get('employment_type')||'Full-time').trim();const description=String(fd.get('description')||'').trim();if(!title||!description)return{error:'Title and description are required.'};const{error}=await s.from('career_postings').insert({title,location,employment_type,description});if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}
export async function removeCareerPosting(id:string){const s=await createClient();const{error}=await s.from('career_postings').delete().eq('id',id);if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}
export async function castEmployeeRating(id: string, ratings: { appearance: number; behavior: number; communication: number; teamwork: number; reliability: number; leadership: number }) {
  const values = Object.values(ratings);
  if (!id || values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
    return { error: 'Every rating must be a whole number from 1 to 5.' };
  }
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { error: 'You must be signed in to submit an employee rating.' };
  const { error } = await s.rpc('cast_employee_rating_v2', {
    employee_uuid: id,
    rater_uuid: user.id,
    appearance_score: ratings.appearance,
    behavior_score: ratings.behavior,
    communication_score: ratings.communication,
    teamwork_score: ratings.teamwork,
    reliability_score: ratings.reliability,
    leadership_score: ratings.leadership,
  });
  if (error) return { error: error.message };
  revalidatePath('/hr');
  revalidatePath('/hr?view=employee-of-the-year');
  revalidatePath(`/employee-of-the-year/${id}`);
  return { error: null };
}

export async function voteEmployee(id:string,_currentVotes:number){const s=await createClient();const{error}=await s.rpc('vote_employee',{employee_uuid:id});if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}
export async function updateEmployeeOfferHeading(id:string,headingHtml:string){const s=await createClient();const{error}=await s.from('employees').update({offer_heading:headingHtml}).eq('id',id);if(error)return{error:error.message};revalidatePath('/hr');return{error:null};}


export async function createEmployeeLetter(input:{employeeId:string;letterType:string;body:string}){
  const s=await createClient();
  if(!input.employeeId||!input.letterType||!input.body.trim())return{error:'Letter type and content are required.'};
  const {error}=await s.from('employee_letters').insert({employee_id:input.employeeId,letter_type:input.letterType,body:input.body,status:'Sent'});
  if(error)return{error:error.message};
  revalidatePath('/hr');revalidatePath('/employee-portal');return{error:null};
}
