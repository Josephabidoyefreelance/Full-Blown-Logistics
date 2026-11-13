-- Read-only infrastructure verification. This does NOT simulate authenticated customers.
SELECT
 to_regprocedure('public.jaad_customer_read_workspace_preferences(uuid)') AS workspace_preferences_rpc,
 to_regprocedure('public.jaad_customer_may_read_workspace_logo(text)') AS logo_read_policy_rpc,
 has_function_privilege('authenticated', 'public.jaad_customer_read_workspace_preferences(uuid)', 'EXECUTE') AS authenticated_can_read_own_preferences,
 has_function_privilege('anon', 'public.jaad_customer_read_workspace_preferences(uuid)', 'EXECUTE') AS anonymous_cannot_read_preferences_should_be_false,
 (SELECT COUNT(*) FROM public.jaad_customer_workspaces) AS mapped_workspaces;
SELECT schemaname,tablename,policyname,cmd
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND policyname IN ('jaad_customer_workspace_logo_select','jaad_customer_workspace_logo_insert')
ORDER BY policyname;
