-- JAAD ERP Stage 2 ADDITIVE settings repair, 2026-11-03
-- Requires 01-stage2-tenant-isolation.sql to have ALREADY been applied.
-- Does not change RLS on operational modules, company IDs, subscription dates,
-- prices, or the UI. Do not rerun the prior migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.jaad_customer_update_own_profile(
 p_first_name text, p_last_name text, p_phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
 IF auth.role() IS DISTINCT FROM 'authenticated' OR v_uid IS NULL THEN
   RAISE EXCEPTION 'Authentication required';
 END IF;
 IF length(coalesce(p_first_name,'')) > 120 OR length(coalesce(p_last_name,'')) > 120
    OR length(coalesce(p_phone,'')) > 50 THEN
   RAISE EXCEPTION 'Invalid personal details';
 END IF;
 UPDATE public.profiles
 SET first_name=trim(coalesce(p_first_name,'')),
     last_name=trim(coalesce(p_last_name,'')),
     full_name=coalesce(nullif(trim(concat_ws(' ',p_first_name,p_last_name)),''),full_name),
     phone=nullif(trim(coalesce(p_phone,'')),'')
 WHERE id=v_uid AND status='Active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Active profile not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_customer_update_own_profile(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaad_customer_update_own_profile(text,text,text) TO authenticated,service_role;

-- The company UUID is passed by the server from a VERIFIED selected customer
-- workspace, then independently checked against the caller in the database.
CREATE OR REPLACE FUNCTION public.jaad_customer_save_workspace_preferences(
 p_company_id uuid, p_company_name text, p_currency text,
 p_tax_rate numeric, p_business_address text, p_logo_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_existing_logo text;
 v_logo_path text;
 v_company_name text := trim(coalesce(p_company_name,''));
 v_currency text := upper(trim(coalesce(p_currency,'')));
BEGIN
 IF auth.role() IS DISTINCT FROM 'authenticated' OR v_uid IS NULL THEN
   RAISE EXCEPTION 'Authentication required';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.jaad_customer_workspaces w
  JOIN public.companies co ON co.id=w.company_id
  JOIN public.customers c ON c.id=w.customer_id
  WHERE w.company_id=p_company_id AND co.owner_user_id=v_uid
    AND c.company_id=co.id AND c.status='Active'
 ) THEN RAISE EXCEPTION 'This company is not owned by the signed-in user'; END IF;
 IF NOT public.jaad_customer_plan_allows(p_company_id,'dashboard') THEN
   RAISE EXCEPTION 'Active trial or subscription required'; END IF;
 IF length(v_company_name) NOT BETWEEN 1 AND 160
    OR v_currency !~ '^[A-Z]{3}$' OR p_tax_rate IS NULL OR
    p_tax_rate < 0 OR p_tax_rate > 100 OR
    length(coalesce(p_business_address,'')) > 1000 THEN
   RAISE EXCEPTION 'Invalid workspace preferences';
 END IF;
 SELECT logo_url INTO v_existing_logo FROM public.company_workspace_settings
 WHERE company_id=p_company_id;
 IF p_logo_url IS NOT NULL AND p_logo_url IS DISTINCT FROM v_existing_logo THEN
   v_logo_path := split_part(p_logo_url,'/storage/v1/object/public/logos/',2);
   IF p_logo_url !~ '^https?://' OR v_logo_path = ''
      OR split_part(v_logo_path,'/',1) <> p_company_id::text
      OR NOT EXISTS (SELECT 1 FROM storage.objects o
        WHERE o.bucket_id='logos' AND o.name=v_logo_path) THEN
     RAISE EXCEPTION 'Logo must be an uploaded object belonging to this workspace';
   END IF;
 END IF;
 UPDATE public.companies SET name=v_company_name WHERE id=p_company_id;
 UPDATE public.customers SET company_name=v_company_name
 WHERE id=(SELECT w.customer_id FROM public.jaad_customer_workspaces w
           WHERE w.company_id=p_company_id);
 INSERT INTO public.company_workspace_settings
   (company_id,currency,tax_rate,business_address,logo_url,updated_at)
 VALUES (p_company_id,v_currency,p_tax_rate,coalesce(p_business_address,''),p_logo_url,now())
 ON CONFLICT(company_id) DO UPDATE
 SET currency=excluded.currency,tax_rate=excluded.tax_rate,
     business_address=excluded.business_address,logo_url=excluded.logo_url,
     updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_customer_save_workspace_preferences(uuid,text,text,numeric,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaad_customer_save_workspace_preferences(uuid,text,text,numeric,text,text)
 TO authenticated,service_role;

-- Do NOT re-grant direct profiles UPDATE permission to authenticated.
-- The old sensitive-column restrictions remain in force.
COMMIT;
