-- Stage 20I: single acquisition lead per registered user.
-- Review and back up the production database before applying.
BEGIN;

CREATE TABLE IF NOT EXISTS public.jaad_platform_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  crm_company_id uuid NOT NULL REFERENCES public.companies(id)
);
ALTER TABLE public.jaad_platform_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jaad_platform_config FROM PUBLIC, anon, authenticated;

-- This company ID was verified against the production companies table and its owner.
INSERT INTO public.jaad_platform_config (singleton, crm_company_id)
SELECT true, c.id
FROM public.companies c
JOIN public.profiles p ON p.id = c.owner_user_id
WHERE c.id = 'af38e1dd-bd67-4f75-93fe-dc141bbe0fe7'::uuid
  AND c.name = 'JAAD Logistics'
  AND lower(p.email) = 'jaadlogistics@gmail.com'
ON CONFLICT (singleton) DO NOTHING;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.jaad_platform_config WHERE singleton = true)
 THEN RAISE EXCEPTION 'Verified JAAD platform company configuration missing'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.jaad_register_business(
 p_user_id uuid, p_business_name text, p_contact_name text, p_phone text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_company uuid;
 v_role uuid;
 v_email text;
 v_platform_company uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Registration requires trusted server';
 END IF;
 IF length(trim(coalesce(p_business_name, ''))) < 2
    OR length(trim(coalesce(p_contact_name, ''))) < 2 THEN
   RAISE EXCEPTION 'Business name and contact name are required';
 END IF;
 SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
 IF v_email IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
 SELECT crm_company_id INTO STRICT v_platform_company
 FROM public.jaad_platform_config WHERE singleton = true;
 SELECT id INTO v_role FROM public.roles
 WHERE name = 'Customer Company Owner' ORDER BY created_at LIMIT 1;
 IF v_role IS NULL THEN RAISE EXCEPTION 'Customer Company Owner role is missing'; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
   RAISE EXCEPTION 'Account already has a profile; use existing workspace or support';
 END IF;
 IF EXISTS (SELECT 1 FROM public.customer_team_members WHERE user_id = p_user_id) THEN
   RAISE EXCEPTION 'Invited employees must accept their existing invitation';
 END IF;
 IF EXISTS (SELECT 1 FROM public.companies WHERE owner_user_id = p_user_id) THEN
   RAISE EXCEPTION 'Company already exists for this user';
 END IF;
 INSERT INTO public.companies (name, owner_user_id)
 VALUES (trim(p_business_name), p_user_id) RETURNING id INTO v_company;
 INSERT INTO public.profiles (id, full_name, email, phone, company_id, role_id, status)
 VALUES (p_user_id, trim(p_contact_name), v_email,
 nullif(trim(coalesce(p_phone, '')), ''), v_company, v_role, 'Active');
 -- Preserve existing registration behavior; review legacy customer reassignment separately.
 UPDATE public.customers SET company_id = v_company
 WHERE user_id = p_user_id AND company_id IS NULL;
 INSERT INTO public.leads (
   company, contact_name, email, phone, source, priority, status,
   company_id, registration_user_id, notes
 ) VALUES (
   trim(p_business_name), trim(p_contact_name), v_email,
   nullif(trim(coalesce(p_phone, '')), ''), 'Website', 'Warm', 'New',
   v_platform_company, p_user_id,
   'JAAD ERP Registration - New business registration. Follow up on onboarding and subscription.'
 ) ON CONFLICT (registration_user_id) WHERE registration_user_id IS NOT NULL DO NOTHING;
 RETURN v_company;
END;
$function$;
COMMIT;
