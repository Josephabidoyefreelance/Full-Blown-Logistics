// JAAD ERP Stage 2 — actual authenticated negative access checks.
// READ-ONLY: performs auth sign-in and SELECT/HEAD/RPC reads; NO row writes.
// Two independent TEST customers with separate workspaces are REQUIRED.
// No service-role key. No credentials are logged. Run from JAAD project root.
import { createRequire } from 'node:module';
// Resolve dependency from the JAAD project root even when this pack is extracted elsewhere.
const projectRequire = createRequire(process.cwd() + '/package.json');
const { createClient } = projectRequire('@supabase/supabase-js');

const vars=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'JAAD_TEST_A_EMAIL','JAAD_TEST_A_PASSWORD','JAAD_TEST_B_EMAIL','JAAD_TEST_B_PASSWORD'];
const missing=vars.filter(k=>!process.env[k]);
if(missing.length){console.error('Missing environment settings: '+missing.join(', '));process.exit(2);}
const {NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:key}=process.env;
const users=[];
function assertValue(condition,msg){if(!condition)throw Error(msg);}
async function login(label,email,password){
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await client.auth.signInWithPassword({email,password});
 assertValue(!error&&auth?.user,`${label}: sign-in failed: ${error?.message??'missing user'}`);
 const {data:ids,error:idsError}=await client.rpc('jaad_my_customer_tenants');
 assertValue(!idsError&&Array.isArray(ids)&&ids.length===1,
   `${label}: expected exactly one customer tenant; found ${ids?.length??'?'} (${idsError?.message??'none'})`);
 const customerId=ids[0];
 const {data:rows,error:prefError}=await client.rpc('jaad_customer_read_workspace_preferences',
   {p_customer_id:customerId});
 assertValue(!prefError&&Array.isArray(rows)&&rows.length===1&&rows[0].company_id,
   `${label}: preferences membership error: ${prefError?.message??'missing company'}`);
 users.push(client);
 return {label,client,customerId,companyId:rows[0].company_id};
}
async function countFor(user,table,column,value){
 const {count,error}=await user.client.from(table).select('*',{count:'exact',head:true}).eq(column,value);
 return {count,error};
}
let passed=0,failed=0,unverified=0;
function report(status,msg){console.log(`${status}: ${msg}`); if(status==='PASS')passed++;else if(status==='FAIL')failed++;else unverified++;}
async function probe(A,B,table,column,selectValueA,selectValueB){
 const [ownA,ownB,otherA,otherB]=await Promise.all([
  countFor(A,table,column,selectValueA),countFor(B,table,column,selectValueB),
  countFor(A,table,column,selectValueB),countFor(B,table,column,selectValueA)]);
 const pairs=[ownA,ownB,otherA,otherB];
 if(pairs.some(x=>x.error)){
   report('UNVERIFIED',`${table}: access/query errors: ${pairs.filter(x=>x.error).map(x=>x.error.message).join(' | ').slice(0,240)}`);return;
 }
 if((otherA.count??0)>0||(otherB.count??0)>0){
   report('FAIL',`${table}: foreign rows visible (A->B=${otherA.count}, B->A=${otherB.count})`);return;
 }
 if((ownA.count??0)>0&&(ownB.count??0)>0){
  report('PASS',`${table}: independent owned rows visible; foreign rows denied`);
 }else{
  report('UNVERIFIED',`${table}: no cross-read, but own fixtures missing/hidden (A=${ownA.count}, B=${ownB.count})`);
 }
}
try {
 const [A,B]=await Promise.all([
  login('A',process.env.JAAD_TEST_A_EMAIL,process.env.JAAD_TEST_A_PASSWORD),
  login('B',process.env.JAAD_TEST_B_EMAIL,process.env.JAAD_TEST_B_PASSWORD)]);
 assertValue(A.customerId!==B.customerId&&A.companyId!==B.companyId,
  'Test accounts share a tenant/company; choose two independent accounts.');
 console.log('Two separate authenticated workspaces verified (IDs omitted).');
 for(const [viewer,target] of [[A,B],[B,A]]){
  const {data,error}=await viewer.client.rpc('jaad_customer_read_workspace_preferences',
   {p_customer_id:target.customerId});
  if(error)report('UNVERIFIED',`preferences RPC: ${viewer.label} denied with error ${error.message}`);
  else if(Array.isArray(data)&&data.length===0) report('PASS',`preferences RPC: ${viewer.label} cannot read other company`);
  else report('FAIL',`preferences RPC: ${viewer.label} received other company preferences`);
 }
 const probes=[
  ['companies','id','company'],['customers','id','customer'],
  ['company_workspace_settings','company_id','company'],
  ['company_subscriptions','company_id','company'],
  ['bookings','company_id','company'],
  ['customer_erp_leads','tenant_customer_id','customer'],
  ['invoices','company_id','company'],['drivers','company_id','company'],
  ['inventory_items','company_id','company'],['fleet_vehicles','company_id','company'],
  ['employees','company_id','company'],['tickets','company_id','company']
 ];
 for(const [table,column,type] of probes){
   const keyA=type==='customer'?A.customerId:A.companyId;
   const keyB=type==='customer'?B.customerId:B.companyId;
   await probe(A,B,table,column,keyA,keyB);
 }
 const anon=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const tracking=await anon.from('tracking_events').select('id',{count:'exact',head:true});
 if(tracking.error)report('PASS','anonymous tracking direct read denied by API');
 else if((tracking.count??0)>0)report('FAIL',`anonymous API can count ${tracking.count} tracking events`);
 else report('UNVERIFIED','anonymous tracking returned 0; no fixture to prove denial');
 console.log(`SUMMARY PASS=${passed} FAIL=${failed} UNVERIFIED=${unverified}`);
 console.log('This test only covers SELECT/RPC reads. Write and Storage tests are still required.');
 process.exitCode=(failed||unverified)?1:0;
} catch(err) {console.error('TEST BLOCKED: '+err.message);process.exitCode=2;}
finally {await Promise.all(users.map(u=>u.auth.signOut().catch(()=>{})));}
