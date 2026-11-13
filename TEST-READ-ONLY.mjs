import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.join(process.cwd(),'package.json'));
const {createClient}=require('@supabase/supabase-js');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let passed=0,failed=0,unverified=0;
function log(type,msg){console.log(`${type}: ${msg}`);if(type==='PASS')passed++;else if(type==='FAIL')failed++;else unverified++;}
function client(){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function login(label,email,password){
 const db=client();const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error || !data?.user)throw Error(`${label}: ${error?.message||'login failed'}`);
 const {data:tenants,error:tenantError}=await db.rpc('jaad_my_customer_tenants');
 if(tenantError || !Array.isArray(tenants)||tenants.length!==1)throw Error(`${label}: expected exactly one active customer workspace (got ${tenants?.length ?? 'error'})`);
 const customer=tenants[0];
 const {data:pref,error:prefError}=await db.rpc('jaad_customer_read_workspace_preferences',{p_customer_id:customer});
 if(prefError || !Array.isArray(pref)||pref.length!==1||!pref[0]?.company_id)throw Error(`${label}: cannot verify customer workspace`);
 return {db,customer,company:pref[0].company_id};
}
async function probe(a,b,table,col,field){
 const ownA=a[field],ownB=b[field];
 const queries=await Promise.all([a.db.from(table).select('*',{head:true,count:'exact'}).eq(col,ownA),b.db.from(table).select('*',{head:true,count:'exact'}).eq(col,ownB),a.db.from(table).select('*',{head:true,count:'exact'}).eq(col,ownB),b.db.from(table).select('*',{head:true,count:'exact'}).eq(col,ownA)]);
 if(queries.some(x=>x.error)){log('UNVERIFIED',`${table}: query error (${queries.find(x=>x.error).error.message})`);return}
 const [aOwn,bOwn,aForeign,bForeign]=queries.map(x=>x.count??0);
 if(aForeign||bForeign)log('FAIL',`${table}: other tenant record visible to a test user`);
 else if(aOwn>0 && bOwn>0)log('PASS',`${table}: both owners see own row(s), neither sees other tenant's row(s)`);
 else log('UNVERIFIED',`${table}: no cross-tenant read seen, but missing test records in one tenant`);
}
try {
 const a=await login('Customer A',process.env.JAAD_TEST_A_EMAIL,process.env.JAAD_TEST_A_PASSWORD);
 const b=await login('Customer B',process.env.JAAD_TEST_B_EMAIL,process.env.JAAD_TEST_B_PASSWORD);
 if(a.company===b.company || a.customer===b.customer)throw Error('Two independent customer companies are required');
 console.log('VERIFIED: Different customer company and workspace IDs.');
 for(const [t,c,field] of [['companies','id','company'],['customers','id','customer'],['company_workspace_settings','company_id','company'],['inventory_items','company_id','company'],['drivers','company_id','company'],['fleet_vehicles','company_id','company'],['employees','company_id','company'],['bookings','company_id','company'],['leads','company_id','company'],['invoices','company_id','company'],['clock_entries','company_id','company'],['support_emails','company_id','company']]){
  await probe(a,b,t,c,field)
 }
 const anon=client(),tracking=await anon.from('tracking_events').select('id',{head:true,count:'exact'});
 if(tracking.error)log('PASS','Anonymous tracking read denied by current database');
 else if(tracking.count>0)log('FAIL','Anonymous tracking events visible');
 else log('UNVERIFIED','No tracking events visible (insufficient data)');
 console.log(`SUMMARY PASS=${passed} FAIL=${failed} UNVERIFIED=${unverified}`);
 if(failed)process.exitCode=1;
} catch(err){console.error('TEST BLOCKED: '+err.message);process.exitCode=2;}
