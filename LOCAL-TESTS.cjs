// Local handler tests with mocked authenticated workspace and storage-backed SQL RPC.
// These do NOT constitute live Supabase/RLS verification.
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const assert = require('assert');
const path = require('path');
const file = path.join(__dirname, 'src/app/api/customer/workspace-settings/route.ts');
const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const COMPANY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const IMAGE = '12345678-1234-4123-8123-123456789abc.png';
const ORIGIN = 'https://jaad-unit-test.supabase.co';
let row, owner, rpcSaves;
const supabase = {
  rpc: async (name, args) => {
    if (name === 'jaad_customer_read_workspace_preferences') return { data:[{...row}],error:null };
    if (name === 'jaad_customer_save_workspace_preferences') {
      rpcSaves++;
      assert.equal(args.p_company_id, COMPANY);
      row = { ...row, company_name: args.p_company_name, currency:args.p_currency, tax_rate:args.p_tax_rate,
        business_address:args.p_business_address,logo_url:args.p_logo_url };
      return {error:null};
    }
    throw new Error('unexpected RPC '+name);
  }
};
const mocks = {
  'next/server': { NextResponse: { json:(body,init={})=>({body,status:init.status||200}) } },
  '@/lib/customer-billing-workspace': { getCustomerBillingWorkspace:async()=>({supabase,customerId:'33333333-3333-4333-8333-333333333333', company:{id:COMPANY},isBillingOwner:owner}) }
};
const moduleExports = {};
const sandbox = { exports: moduleExports, require: n => { if(!mocks[n])throw Error('unexpected import '+n); return mocks[n]; }, process: { env: {NEXT_PUBLIC_SUPABASE_URL:ORIGIN}}, Request:class {} };
vm.runInNewContext(code,sandbox, {filename:file});
const { PATCH } = moduleExports;
async function run(body) {return PATCH({json:async()=>body})}
function reset() { row={company_id:COMPANY,company_name:'Alpha Ltd',currency:'NGN',tax_rate:7.5,business_address:'',logo_url:null};owner=true;rpcSaves=0 }
(async()=>{
  reset();
  row.logo_url=`${ORIGIN}/storage/v1/object/public/logos/${OTHER}/${IMAGE}`;
  let x=await run({company_name:'Alpha Ltd',currency:'USD',tax_rate:17.5,business_address:'test'});
  assert.equal(x.status,200);assert.equal(x.body.currency,'USD');assert.equal(x.body.logo_url,'');assert.equal(rpcSaves,1);
  console.log('PASS saved settings despite old foreign workspace logo');
  reset();
  x=await run({company_name:'Alpha Ltd',currency:'GBP',tax_rate:20,business_address:'test',logo_url:`${ORIGIN}/storage/v1/object/public/logos/${OTHER}/${IMAGE}`});
  assert.equal(x.status,200);assert.equal(x.body.currency,'GBP');assert.equal(rpcSaves,1);
  console.log('PASS browser-supplied stale logo URL cannot block currency/tax');
  reset();
  x=await run({company_name:'Alpha Ltd',currency:'USD',tax_rate:7.5,logo_path:`${OTHER}/${IMAGE}`});
  assert.equal(x.status,400);assert.equal(rpcSaves,0);
  console.log('PASS foreign company logo object path rejected');
  reset();
  x=await run({company_name:'Alpha Ltd',currency:'USD',tax_rate:7.5,logo_path:`${COMPANY}/${IMAGE}`});
  assert.equal(x.status,200);assert.equal(x.body.logo_url,`${ORIGIN}/storage/v1/object/public/logos/${COMPANY}/${IMAGE}`);
  console.log('PASS server constructs canonical URL for owned logo key');
  reset();owner=false;
  x=await run({company_name:'Alpha Ltd',currency:'USD',tax_rate:7.5});
  assert.equal(x.status,403);assert.equal(rpcSaves,0);
  console.log('PASS authenticated non-owner denied preferences write');
  console.log('5/5 local handler tests passed. THIS DOES NOT replace authenticated Supabase tests.');
})().catch(err=>{console.error(err);process.exit(1)});
