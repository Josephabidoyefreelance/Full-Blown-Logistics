'use server';

import {
  submitCareerApplication as submitCareerApplicationImpl,
  submitApplication as submitApplicationImpl,
} from '@/app/customer/dashboard/workspace/hr/careers/[id]/actions';

export async function submitCareerApplication(fd: FormData) {
  return submitCareerApplicationImpl(fd);
}

export async function submitApplication(fd: FormData) {
  return submitApplicationImpl(fd);
}