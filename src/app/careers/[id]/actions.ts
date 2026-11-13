'use server';
import {submitCareerApplication} from '@/app/customer/dashboard/workspace/hr/careers/[id]/actions';
export async function submitApplication(formData:FormData){return submitCareerApplication(formData);}
