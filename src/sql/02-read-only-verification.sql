-- Stage 2 post-migration verification. SELECT ONLY. Do not execute prior to migration.
-- These checks do not replace authenticated cross-tenant SELECT/WRITE tests.
SELECT
 (SELECT count(*) FROM public.jaad_customer_workspaces) AS bound_workspaces,
 (SELECT count(*) FROM public.company_subscriptions) AS subscribed_companies,
 (SELECT count(*) FROM public.companies co
  WHERE co.id IS DISTINCT FROM (SELECT crm_company_id FROM public.jaad_platform_config
     WHERE singleton=true LIMIT 1)
    AND EXISTS(SELECT 1 FROM public.company_subscriptions s WHERE s.company_id=co.id)
    AND NOT EXISTS(SELECT 1 FROM public.jaad_customer_workspaces w WHERE w.company_id=co.id)
 ) AS unbound_subscribed_companies_should_be_zero,
 (SELECT count(*) FROM public.jaad_customer_workspaces w
  JOIN public.companies co ON co.id=w.company_id
  JOIN public.customers c ON c.id=w.customer_id
  WHERE c.user_id IS DISTINCT FROM co.owner_user_id
     OR c.company_id IS DISTINCT FROM co.id
 ) AS binding_owner_mismatch_should_be_zero;

SELECT plan_code,status,count(*) AS companies
FROM public.company_subscriptions
GROUP BY plan_code,status ORDER BY plan_code,status;

SELECT conrelid::regclass AS table_name,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid IN (
  'public.company_subscriptions'::regclass,'public.billing_payment_attempts'::regclass)
 AND conname LIKE '%plan_code%' ORDER BY table_name,conname;

SELECT schemaname,tablename,policyname,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('customer_erp_leads','customers','customer_team_members',
  'company_subscriptions','company_workspace_settings')
 ORDER BY tablename,policyname;

SELECT
 has_function_privilege('anon', 'public.jaad_register_business(uuid,text,text,text)', 'EXECUTE')
   AS anon_can_register_should_be_false,
 has_function_privilege('authenticated', 'public.jaad_register_business(uuid,text,text,text)', 'EXECUTE')
   AS user_can_register_rpc_should_be_false,
 has_function_privilege('authenticated', 'public.jaad_activate_subscription_from_payment(text,text,timestamptz)', 'EXECUTE')
   AS user_can_activate_payment_should_be_false,
 has_table_privilege('anon','public.jaad_customer_workspaces','INSERT')
   AS anon_can_insert_workspace_should_be_false;
