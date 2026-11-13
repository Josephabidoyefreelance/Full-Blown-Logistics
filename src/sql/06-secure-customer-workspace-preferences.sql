-- JAAD Stage 2 — safe workspace preference read, standalone additive migration.
-- Apply ONLY after your existing 01 and 04 Stage 2 migrations. No trial resets.
-- SECURITY: SELECT is allowed exclusively for the authenticated company owner
-- or an accepted ACTIVE customer staff member of the requested workspace.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.jaad_customer_workspaces') IS NULL THEN
  RAISE EXCEPTION 'Stage 2 customer workspace bindings are missing';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.jaad_customer_read_workspace_preferences(p_customer_id uuid)
RETURNS TABLE (
  company_id uuid,
  company_name text,
  owner_user_id uuid,
  is_owner boolean,
  currency text,
  tax_rate numeric,
  business_address text,
  logo_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT co.id, co.name::text, co.owner_user_id,
   (co.owner_user_id = (SELECT auth.uid())) AS is_owner,
   coalesce(s.currency,'NGN')::text AS currency,
   coalesce(s.tax_rate,7.5)::numeric AS tax_rate,
   coalesce(s.business_address,'')::text AS business_address,
   s.logo_url::text
 FROM public.jaad_customer_workspaces w
 JOIN public.companies co ON co.id=w.company_id
 JOIN public.customers c ON c.id=w.customer_id AND c.company_id=co.id
 LEFT JOIN public.company_workspace_settings s ON s.company_id=co.id
 WHERE w.customer_id=p_customer_id
   AND lower(c.status)='active'
   AND (SELECT auth.uid()) IS NOT NULL
   AND (
      co.owner_user_id=(SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.customer_team_members m
        WHERE m.customer_id=w.customer_id
          AND m.user_id=(SELECT auth.uid())
          AND lower(m.status)='active'
          AND m.accepted_at IS NOT NULL
      )
   )
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.jaad_customer_read_workspace_preferences(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaad_customer_read_workspace_preferences(uuid)
 TO authenticated,service_role;
COMMENT ON FUNCTION public.jaad_customer_read_workspace_preferences(uuid) IS
 'Workspace-scoped current preferences, with independent owner/accepted-staff authorization. No administrative tenant fallback.';

-- Private logos must be readable by the legitimate workspace owner/staff,
-- not anonymous users or members of another tenant.
CREATE OR REPLACE FUNCTION public.jaad_customer_may_read_workspace_logo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL
   AND p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'
   AND EXISTS (
     SELECT 1 FROM public.jaad_customer_workspaces w
     JOIN public.companies co ON co.id=w.company_id
     JOIN public.customers c ON c.id=w.customer_id
     WHERE co.id::text=split_part(p_path,'/',1)
       AND lower(c.status)='active'
       AND (co.owner_user_id=(SELECT auth.uid()) OR EXISTS (
         SELECT 1 FROM public.customer_team_members m
         WHERE m.customer_id=w.customer_id
           AND m.user_id=(SELECT auth.uid())
           AND lower(m.status)='active' AND m.accepted_at IS NOT NULL
       ))
   );
$$;
REVOKE ALL ON FUNCTION public.jaad_customer_may_read_workspace_logo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaad_customer_may_read_workspace_logo(text) TO authenticated,service_role;
DROP POLICY IF EXISTS jaad_customer_workspace_logo_select ON storage.objects;
CREATE POLICY jaad_customer_workspace_logo_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='logos' AND public.jaad_customer_may_read_workspace_logo(name));

NOTIFY pgrst, 'reload schema';
COMMIT;
