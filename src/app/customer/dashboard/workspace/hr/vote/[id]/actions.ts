'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitPublicVote(id:string, ratings:{appearance:number;behavior:number;communication:number;teamwork:number;reliability:number;leadership:number}){
  const supabase=await createClient();
  const {error}=await supabase.rpc('cast_employee_of_year_vote',{
    p_employee_id:id,
    p_appearance:ratings.appearance,
    p_behavior:ratings.behavior,
    p_communication:ratings.communication,
    p_teamwork:ratings.teamwork,
    p_reliability:ratings.reliability,
    p_leadership:ratings.leadership,
  });
  return error?{error:error.message}:{error:null};
}
