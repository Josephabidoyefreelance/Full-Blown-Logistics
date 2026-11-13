import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function serviceClient(): SupabaseClient | null {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return url && key ? createClient(url,key,{auth:{persistSession:false}}) : null;
}

// Only explicitly registered inbound addresses may be routed to a tenant.
export async function resolveInboundTenant(db:SupabaseClient, recipients:unknown):Promise<string|null>{
 const addresses=(Array.isArray(recipients)?recipients:[recipients])
  .filter((x):x is string=>typeof x==='string')
  .map(x=>x.trim().toLowerCase()).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
 if(!addresses.length)return null;
 const {data,error}=await db.from('support_inbound_addresses').select('company_id,address').in('address',addresses);
 if(error)throw new Error('Inbound tenant mapping lookup failed: '+error.message);
 const ids=[...new Set((data||[]).map(x=>x.company_id).filter(Boolean))];
 return ids.length===1 ? ids[0] : null;
}