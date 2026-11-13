// Mock-only tests for signed logo URL handler. NO live Supabase calls.
const vm=require('vm'), fs=require('fs'), path=require('path'),ts=require('typescript'),assert=require('assert');
const COMPANY='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const IMG='12345678-1234-4123-8123-123456789abc.png';
const ORIGIN='https://jaad-unit-test.supabase.co';
let logoUrl, ownerAllowed=true, signedRequests=0;
const supabase={
 rpc:async(name)=> ({data:[{logo_url:logoUrl}],error:null}),
 storage:{from:(bucket)=>{assert.equal(bucket,'logos');return {createSignedUrl:async(key,expiry)=>{signedRequests++;assert.equal(key,`${COMPANY}/${IMG}`);assert.equal(expiry,900);return {data:{signedUrl:`${ORIGIN}/storage/v1/object/sign/logos/${key}?token=TEST`},error:null}}}}}
};
const modules={
 'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status||200})}},
 '@/lib/customer-billing-workspace':{getCustomerBillingWorkspace:async()=>ownerAllowed?{supabase,company:{id:COMPANY},customerId:'33333333-3333-4333-8333-333333333333'}:null}
};
const file=path.join(__dirname,'src/app/api/customer/workspace-logo/route.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={};
vm.runInNewContext(code,{exports:mod,require:(name)=>{if(!modules[name])throw Error(name);return modules[name]},process:{env:{NEXT_PUBLIC_SUPABASE_URL:ORIGIN}}});
(async()=>{
 logoUrl=`${ORIGIN}/storage/v1/object/public/logos/${COMPANY}/${IMG}`;signedRequests=0;let x=await mod.GET();
 assert.equal(x.status,200);assert(x.body.url.includes('/object/sign/logos/'));assert.equal(signedRequests,1);
 console.log('PASS valid 5-part UUID logo is signed for the owner');
 logoUrl=`${ORIGIN}/storage/v1/object/public/logos/${OTHER}/${IMG}`;signedRequests=0;x=await mod.GET();
 assert.equal(x.status,200);assert.equal(x.body.url,null);assert.equal(signedRequests,0);
 console.log('PASS foreign company logo is never signed');
 ownerAllowed=false;x=await mod.GET();assert.equal(x.status,403);
 console.log('PASS unauthorized workspace cannot request a logo');
 console.log('3/3 mocked logo read tests passed. Not a Supabase RLS test.');
})().catch(e=>{console.error(e);process.exit(1)});
