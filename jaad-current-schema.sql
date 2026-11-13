


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "public"."accept_staff_invite"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update customer_team_members
  set status = 'Active',
      accepted_at = now(),
      status_changed_at = now(),
      status_changed_by = 'Self (accepted invite)'
  where user_id = auth.uid()
    and status = 'Invited';
end;
$$;


ALTER FUNCTION "public"."accept_staff_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_has_module"("module_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select module_key = any(auth_permitted_modules());
$$;


ALTER FUNCTION "public"."auth_has_module"("module_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_permitted_modules"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(
    (
      SELECT r.permitted_modules
      FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = (SELECT auth.uid())
        AND lower(coalesce(p.status, '')) = 'active'
      LIMIT 1
    ),
    ARRAY[]::text[]
  );
$$;


ALTER FUNCTION "public"."auth_permitted_modules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cast_employee_of_year_vote"("p_employee_id" "uuid", "p_appearance" integer, "p_behavior" integer, "p_communication" integer, "p_teamwork" integer, "p_reliability" integer, "p_leadership" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_total integer;
declare v_votes integer;
begin
  if p_appearance not between 1 and 5 or p_behavior not between 1 and 5 or p_communication not between 1 and 5
     or p_teamwork not between 1 and 5 or p_reliability not between 1 and 5 or p_leadership not between 1 and 5 then
    raise exception 'All ratings must be between 1 and 5';
  end if;
  v_total := p_appearance+p_behavior+p_communication+p_teamwork+p_reliability+p_leadership;
  insert into public.employee_year_votes(employee_id,appearance,behavior,communication,teamwork,reliability,leadership,total_score)
  values(p_employee_id,p_appearance,p_behavior,p_communication,p_teamwork,p_reliability,p_leadership,v_total);
  update public.employees set votes=coalesce(votes,0)+1 where id=p_employee_id returning votes into v_votes;
  if v_votes is null then raise exception 'Employee not found'; end if;
  return v_votes;
end;
$$;


ALTER FUNCTION "public"."cast_employee_of_year_vote"("p_employee_id" "uuid", "p_appearance" integer, "p_behavior" integer, "p_communication" integer, "p_teamwork" integer, "p_reliability" integer, "p_leadership" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cast_employee_rating"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> rater_uuid THEN
    RAISE EXCEPTION 'You are not allowed to submit a rating for another user.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = employee_uuid) THEN
    RAISE EXCEPTION 'Employee not found.';
  END IF;

  INSERT INTO public.employee_ratings (
    employee_id, rater_id, appearance, behavior, communication,
    teamwork, reliability, leadership, updated_at
  ) VALUES (
    employee_uuid, rater_uuid, appearance_score, behavior_score, communication_score,
    teamwork_score, reliability_score, leadership_score, now()
  )
  ON CONFLICT (employee_id, rater_id) DO UPDATE SET
    appearance = EXCLUDED.appearance,
    behavior = EXCLUDED.behavior,
    communication = EXCLUDED.communication,
    teamwork = EXCLUDED.teamwork,
    reliability = EXCLUDED.reliability,
    leadership = EXCLUDED.leadership,
    updated_at = now();

  -- Keep the existing public vote count meaningful: one completed star-rating
  -- submission counts as one Employee-of-the-Year vote for that employee.
  UPDATE public.employees e
  SET votes = (
    SELECT COUNT(*)::integer
    FROM public.employee_ratings r
    WHERE r.employee_id = e.id
  )
  WHERE e.id = employee_uuid;
END;
$$;


ALTER FUNCTION "public"."cast_employee_rating"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cast_employee_rating_v2"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> rater_uuid THEN RAISE EXCEPTION 'You are not allowed to submit a rating for another user.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.employees WHERE id=employee_uuid) THEN RAISE EXCEPTION 'Employee not found.'; END IF;
  INSERT INTO public.employee_ratings(employee_id,rater_id,appearance,behavior,communication,teamwork,reliability,leadership,updated_at)
  VALUES(employee_uuid,rater_uuid,appearance_score,behavior_score,communication_score,teamwork_score,reliability_score,leadership_score,now())
  ON CONFLICT(employee_id,rater_id) DO UPDATE SET appearance=EXCLUDED.appearance,behavior=EXCLUDED.behavior,communication=EXCLUDED.communication,teamwork=EXCLUDED.teamwork,reliability=EXCLUDED.reliability,leadership=EXCLUDED.leadership,updated_at=now();
  UPDATE public.employees e SET votes=(SELECT COUNT(*)::integer FROM public.employee_ratings r WHERE r.employee_id=e.id) WHERE e.id=employee_uuid;
END; $$;


ALTER FUNCTION "public"."cast_employee_rating_v2"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_has_module"("module_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select module_key = any(customer_permitted_modules());
$$;


ALTER FUNCTION "public"."customer_has_module"("module_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_id_for_active_staff"("uid" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT m.customer_id
  FROM public.customer_team_members m
  JOIN public.customers c ON c.id = m.customer_id
  WHERE m.user_id = uid
    AND uid = (SELECT auth.uid())
    AND lower(m.status) = 'active'
    AND m.accepted_at IS NOT NULL
    AND lower(c.status) = 'active'
  ORDER BY m.accepted_at DESC, m.id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."customer_id_for_active_staff"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_modules_for_role"("role_name" "text") RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case role_name
    when 'Owner' then array['overview','inventory','leads','shipments','track','invoices','notes','report','support','profile','calculator','utilities']
    when 'Marketing' then array['overview','leads']
    when 'Customer Service' then array['leads','support','notes']
    when 'Finance' then array['report','invoices','utilities']
    when 'Warehouse' then array['inventory','shipments','track']
    when 'Operations' then array['shipments','track','notes']
    else array[]::text[]
  end;
$$;


ALTER FUNCTION "public"."customer_modules_for_role"("role_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_permitted_modules"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.user_id = (SELECT auth.uid())
        AND lower(c.status) = 'active'
    )
    THEN ARRAY[
      'overview', 'inventory', 'leads', 'shipments',
      'track', 'invoices', 'notes', 'report',
      'support', 'profile', 'calculator', 'utilities'
    ]::text[]
    ELSE COALESCE(
      (
        SELECT m.permitted_modules
        FROM public.customer_team_members m
        JOIN public.customers c ON c.id = m.customer_id
        WHERE m.user_id = (SELECT auth.uid())
          AND lower(m.status) = 'active'
          AND m.accepted_at IS NOT NULL
          AND lower(c.status) = 'active'
        ORDER BY m.accepted_at DESC, m.id
        LIMIT 1
      ),
      ARRAY[]::text[]
    )
  END;
$$;


ALTER FUNCTION "public"."customer_permitted_modules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."effective_customer_owner_id"("uid" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select coalesce(
    (select user_id from customers where user_id = uid limit 1),
    (
      select c.user_id
      from customer_team_members tm
      join customers c on c.id = tm.customer_id
      where tm.user_id = uid and tm.status = 'Active'
      limit 1
    )
  );
$$;


ALTER FUNCTION "public"."effective_customer_owner_id"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."effective_customer_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(
    (
      SELECT c.user_id
      FROM public.customers c
      WHERE c.user_id = (SELECT auth.uid())
        AND c.status = 'Active'
      LIMIT 1
    ),
    (
      SELECT c.user_id
      FROM public.customer_team_members m
      JOIN public.customers c
        ON c.id = m.customer_id
      WHERE m.user_id = (SELECT auth.uid())
        AND m.status = 'Active'
        AND m.accepted_at IS NOT NULL
        AND c.status = 'Active'
      LIMIT 1
    )
  );
$$;


ALTER FUNCTION "public"."effective_customer_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tracking_no"("p_pickup" "date") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  seq_val bigint;
begin
  seq_val := nextval('booking_seq');
  return 'JAAD/' || to_char(p_pickup,'DDMM') || '/' || to_char(p_pickup,'YYYY') || '/' || lpad(seq_val::text,5,'0');
end;
$$;


ALTER FUNCTION "public"."generate_tracking_no"("p_pickup" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_employee_profile"("employee_uuid" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "department" "text", "role_title" "text", "votes" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT e.id,e.name,e.department,e.role_title,e.votes FROM public.employees e WHERE e.id=employee_uuid;
$$;


ALTER FUNCTION "public"."get_public_employee_profile"("employee_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_employee_profile_v2"("employee_uuid" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "department" "text", "role_title" "text", "votes" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT e.id,e.name,e.department,e.role_title,COALESCE(e.votes,0)
  FROM public.employees e WHERE e.id=employee_uuid;
$$;


ALTER FUNCTION "public"."get_public_employee_profile_v2"("employee_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_customer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Authentication only.
  -- Company provisioning happens after OTP verification.
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_employee_votes"("employee_uuid" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.employees
  set votes = coalesce(votes, 0) + 1
  where id = employee_uuid;
$$;


ALTER FUNCTION "public"."increment_employee_votes"("employee_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_activate_subscription_from_payment"("p_reference" "text", "p_paystack_transaction_id" "text", "p_paid_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_attempt public.billing_payment_attempts%ROWTYPE;
  v_existing public.company_subscriptions%ROWTYPE;
  v_provider text;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_paid_at timestamptz;
BEGIN
  SELECT *
  INTO v_attempt
  FROM public.billing_payment_attempts
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown JAAD payment reference';
  END IF;

  -- Idempotency: never extend a subscription twice.
  IF v_attempt.status = 'paid' THEN
    RETURN;
  END IF;

  IF v_attempt.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment attempt is not pending';
  END IF;

  IF p_paystack_transaction_id IS NULL
     OR length(trim(p_paystack_transaction_id)) = 0 THEN
    RAISE EXCEPTION 'Missing payment transaction ID';
  END IF;

  v_provider := lower(
    coalesce(
      nullif(v_attempt.payment_provider, ''),
      'paystack'
    )
  );

  IF v_provider NOT IN ('flutterwave', 'paystack') THEN
    RAISE EXCEPTION 'Unsupported payment provider';
  END IF;

  v_paid_at := coalesce(p_paid_at, now());

  UPDATE public.billing_payment_attempts
  SET
    status = 'paid',
    flutterwave_transaction_id =
      CASE WHEN v_provider = 'flutterwave'
        THEN p_paystack_transaction_id
        ELSE flutterwave_transaction_id
      END,
    paystack_transaction_id =
      CASE WHEN v_provider = 'paystack'
        THEN p_paystack_transaction_id
        ELSE paystack_transaction_id
      END,
    paid_at = v_paid_at,
    failure_message = NULL
  WHERE id = v_attempt.id;

  SELECT *
  INTO v_existing
  FROM public.company_subscriptions
  WHERE company_id = v_attempt.company_id
  FOR UPDATE;

  IF FOUND
     AND v_existing.status = 'active'
     AND v_existing.current_period_end > v_paid_at THEN
    v_period_start := v_existing.current_period_start;
    v_period_end :=
      v_existing.current_period_end + INTERVAL '1 month';
  ELSE
    v_period_start := v_paid_at;
    v_period_end := v_paid_at + INTERVAL '1 month';
  END IF;

  INSERT INTO public.company_subscriptions (
    company_id,
    plan_code,
    status,
    amount_kobo,
    current_period_start,
    current_period_end,
    last_payment_reference,
    updated_at
  )
  VALUES (
    v_attempt.company_id,
    v_attempt.plan_code,
    'active',
    v_attempt.amount_kobo,
    v_period_start,
    v_period_end,
    v_attempt.reference,
    now()
  )
  ON CONFLICT (company_id)
  DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = 'active',
    amount_kobo = EXCLUDED.amount_kobo,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    last_payment_reference = EXCLUDED.last_payment_reference,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."jaad_activate_subscription_from_payment"("p_reference" "text", "p_paystack_transaction_id" "text", "p_paid_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_assign_company_on_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tenant uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  tenant := public.jaad_current_company_id();

  IF tenant IS NULL THEN
    RAISE EXCEPTION 'No active company workspace is linked to this account';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.company_id IS NOT NULL AND NEW.company_id <> tenant THEN
      RAISE EXCEPTION 'Cross-company insert is not allowed';
    END IF;
    NEW.company_id := tenant;
  ELSE
    IF OLD.company_id IS DISTINCT FROM tenant THEN
      RAISE EXCEPTION 'Cross-company update is not allowed';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Changing record company is not allowed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jaad_assign_company_on_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_current_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT p.company_id
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
    AND lower(coalesce(p.status, 'active')) = 'active'
  LIMIT 1;
$$;


ALTER FUNCTION "public"."jaad_current_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_current_user_is_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.status, '')) = 'active'
  );
$$;


ALTER FUNCTION "public"."jaad_current_user_is_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_current_user_is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and lower(coalesce(p.status, '')) = 'active'
      and lower(trim(coalesce(r.name, ''))) = 'super admin'
  );
$$;


ALTER FUNCTION "public"."jaad_current_user_is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_initialize_company_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.company_subscriptions (
    company_id, plan_code, status, amount_kobo,
    current_period_start, current_period_end
  ) VALUES (
    NEW.id, 'basic', 'trialing', 0,
    NOW(), NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jaad_initialize_company_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_my_customer_tenants"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = (SELECT auth.uid())
      AND c.status = 'Active'

    UNION

    SELECT tm.customer_id
    FROM public.customer_team_members tm
    JOIN public.customers c
      ON c.id = tm.customer_id
    WHERE tm.user_id = (SELECT auth.uid())
      AND tm.status = 'Active'
      AND tm.accepted_at IS NOT NULL
      AND c.status = 'Active';
$$;


ALTER FUNCTION "public"."jaad_my_customer_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_protect_profile_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.id IS DISTINCT FROM OLD.id
    THEN
      RAISE EXCEPTION
        'Company, role, status and user identity cannot be changed through profile updates';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jaad_protect_profile_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_register_business"("p_user_id" "uuid", "p_business_name" "text", "p_contact_name" "text", "p_phone" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."jaad_register_business"("p_user_id" "uuid", "p_business_name" "text", "p_contact_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_submit_career_application"("p_posting_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_location" "text" DEFAULT ''::"text", "p_cover_note" "text" DEFAULT ''::"text", "p_cv_path" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE v_company uuid; v_title text;
BEGIN
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 160 OR length(trim(coalesce(p_email,''))) NOT BETWEEN 5 AND 254
    OR position('@' in p_email)<2 OR length(coalesce(p_phone,''))>50 OR length(coalesce(p_cover_note,''))>10000 THEN
  RAISE EXCEPTION 'Invalid application details';
 END IF;
 SELECT company_id,title INTO v_company,v_title FROM public.career_postings WHERE id=p_posting_id AND company_id IS NOT NULL;
 IF v_company IS NULL THEN RAISE EXCEPTION 'This vacancy is unavailable'; END IF;
 IF p_cv_path IS NOT NULL AND p_cv_path !~ ('^incoming/'||p_posting_id::text||'/[0-9a-f-]{36}\.(pdf|doc|docx)$') THEN
  RAISE EXCEPTION 'Invalid CV path';
 END IF;
 IF p_cv_path IS NOT NULL AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='applicant-cvs' AND name=p_cv_path) THEN
  RAISE EXCEPTION 'CV upload not found';
 END IF;
 INSERT INTO public.applicants(company_id,posting_id,name,email,phone,location,role_applied_for,stage,cover_note,cv_url,cv_name)
 VALUES(v_company,p_posting_id,trim(p_name),trim(p_email),trim(p_phone),nullif(trim(p_location),''),v_title,'Screening',nullif(trim(p_cover_note),''),p_cv_path,CASE WHEN p_cv_path IS NULL THEN NULL ELSE split_part(p_cv_path,'/',3) END);
END $_$;


ALTER FUNCTION "public"."jaad_submit_career_application"("p_posting_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_location" "text", "p_cover_note" "text", "p_cv_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jaad_validate_live_chat_company"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.live_chats AS lc
    WHERE lc.id = NEW.chat_id
      AND lc.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION
      'Chat message must belong to the same company as its parent chat';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."jaad_validate_live_chat_company"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_tracking_no"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.tracking_no := generate_tracking_no(new.pickup_date);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_set_tracking_no"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vote_employee"("employee_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.employees
  SET votes = COALESCE(votes,0) + 1
  WHERE id = employee_uuid;
END;
$$;


ALTER FUNCTION "public"."vote_employee"("employee_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION "storage"."allow_only_operation"("expected_operation" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_lifecycle_service_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog'
    AS $$
BEGIN
  IF current_user::text IS DISTINCT FROM TG_ARGV[0]
     AND (
       OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
       OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation
     ) THEN
    -- AFTER runs only after caller RLS has accepted the proposed row. The API
    -- recognizes this specific error after rolling back its permission probe;
    -- direct non-service writes still fail and cannot persist the change.
    RAISE EXCEPTION 'bucket control columns may only be changed by the configured storage service role'
      USING ERRCODE = 'PST01',
            SCHEMA = TG_TABLE_SCHEMA,
            TABLE = TG_TABLE_NAME,
            CONSTRAINT = TG_NAME;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."enforce_bucket_lifecycle_service_role"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN p_delimiter <> ''
         AND position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(
        p_key,
        length(p_prefix)
            + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1))
            + length(p_delimiter) - 1
    )
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"("noncurrent_versions" "text" DEFAULT 'include'::"text", "delete_markers" "text" DEFAULT 'include'::"text") RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'include');
    delete_markers := COALESCE(delete_markers, 'include');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'include';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'include';
    END IF;

    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        where (noncurrent_versions != 'exclude' OR obj.archived_at IS NULL)
          and (noncurrent_versions != 'only' OR obj.archived_at IS NOT NULL)
          and (delete_markers != 'exclude' OR NOT obj.is_delete_marker)
          and (delete_markers != 'only' OR obj.is_delete_marker)
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"("noncurrent_versions" "text", "delete_markers" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text", "raw_prefix_param" "text" DEFAULT NULL::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $_$
WITH candidates AS (
    SELECT
        upload.key AS object_key,
        CASE
            WHEN position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0
            THEN left(
                upload.key,
                length(coalesce($7, $2))
                    + position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1))
                    + length($3) - 1
            )
            ELSE upload.key
        END AS result_key,
        upload.id,
        upload.created_at,
        position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0 AS is_common_prefix
    FROM storage.s3_multipart_uploads AS upload
    WHERE upload.bucket_id = $1
      AND upload.key COLLATE "C" LIKE $2 || '%'
), filtered AS (
    SELECT candidate.*
    FROM candidates AS candidate
    WHERE $5 = ''
       OR candidate.result_key COLLATE "C" > $5
       OR (
           candidate.result_key COLLATE "C" = $5
           AND NOT candidate.is_common_prefix
           AND $6 <> ''
           -- A completed or aborted marker repeats the remaining same-key uploads.
           AND COALESCE(
               (candidate.created_at, candidate.id COLLATE "C") > (
                   SELECT marker.created_at, marker.id COLLATE "C"
                   FROM storage.s3_multipart_uploads AS marker
                   WHERE marker.bucket_id = $1
                     AND marker.key COLLATE "C" = $5
                     AND marker.id = $6
               ),
               TRUE
           )
       )
), ranked AS (
    SELECT
        filtered.*,
        row_number() OVER (
            PARTITION BY filtered.result_key COLLATE "C"
            ORDER BY filtered.created_at, filtered.id COLLATE "C"
        ) AS prefix_rank
    FROM filtered
)
SELECT ranked.result_key, ranked.id, ranked.created_at
FROM ranked
WHERE NOT ranked.is_common_prefix OR ranked.prefix_rank = 1
ORDER BY ranked.result_key COLLATE "C", ranked.created_at, ranked.id COLLATE "C"
LIMIT $4;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text", "raw_prefix_param" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "noncurrent_versions" "text" DEFAULT 'exclude'::"text", "delete_markers" "text" DEFAULT 'exclude'::"text", "next_token_archived_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "next_token_version" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "version" "text", "archived_at" timestamp with time zone, "is_delete_marker" boolean, "is_versioned" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_start_relative TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;

    -- true when noncurrent_versions can return >1 row per name; keeps them
    -- ordered most-recent-first and lets pagination resume mid-key
    v_multi_row BOOLEAN;
    v_name_order TEXT;
    v_exact_range_predicate TEXT;
    v_strict_range_predicate TEXT;
    v_inclusive_range_predicate TEXT;

    -- Seek state for the current name. archived_at is normalized to JavaScript's
    -- millisecond precision and version breaks ties within the same millisecond.
    -- Current rows use 'infinity'; NULL means no tiebreak has been established.
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_cursor_is_folder BOOLEAN;
    v_count INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_batch_query_strict TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');
    v_name_order := CASE WHEN v_is_asc THEN 'ASC' ELSE 'DESC' END;

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Keep caller-provided cursors inside the requested prefix range.
    IF v_start <> '' AND v_upper_bound IS NOT NULL THEN
        IF v_is_asc THEN
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                v_start := '';
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                RETURN;
            END IF;
        ELSE
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                RETURN;
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                v_start := '';
            END IF;
        END IF;
    END IF;

    v_start_relative := substring(v_start FROM length(v_prefix) + 1);

    -- Direction affects only the indexed name range and its ordering. Cursor
    -- state transitions and within-key version ordering stay shared.
    IF v_is_asc THEN
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" > $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" >= $2';
        IF v_upper_bound IS NOT NULL THEN
            v_exact_range_predicate := 'o.name COLLATE "C" < $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" < $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" < $3';
        END IF;
    ELSE
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" < $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" < $2';
        IF v_prefix <> '' THEN
            v_exact_range_predicate := 'o.name COLLATE "C" >= $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" >= $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" >= $3';
        END IF;
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    -- The multi-row order matches the externally serialized cursor exactly:
    -- archived_at at millisecond precision, then version as the final tiebreak.
    --
    -- When v_multi_row, the seek is a keyset tuple comparison ("name > $2 OR
    -- (name = $2 AND tiebreak)") - Postgres won't split that OR into indexable
    -- form (confirmed even with fully literal values), so as one WHERE clause
    -- it forces a full bucket scan filtered row-by-row. Splitting it into two
    -- independently-indexable branches (exact name match with the tiebreak
    -- filter, vs. strictly-past names) combined with UNION ALL lets each
    -- branch keep name as a real index condition; the outer ORDER BY/LIMIT
    -- re-merges them into the same page the single query used to produce.
    IF v_multi_row THEN
        v_batch_query := format(
            $sql$
            SELECT *
            FROM (
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND o.name COLLATE "C" = $2
                      AND %s
                      AND NOT $7::boolean
                      AND (
                          $5::timestamptz IS NULL
                          OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < $5
                          OR (
                              COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = $5
                              AND COALESCE(o.version, '') > $6
                          )
                      )
                      %s
                    ORDER BY
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
                UNION ALL
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND %s
                      %s
                    ORDER BY
                        o.name COLLATE "C" %s,
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
            ) sub
            ORDER BY
                sub.name COLLATE "C" %s,
                COALESCE(date_trunc('milliseconds', sub.archived_at), 'infinity'::timestamptz) DESC,
                COALESCE(sub.version, '') ASC
            LIMIT $4
            $sql$,
            v_exact_range_predicate,
            v_version_filter,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order,
            v_name_order
        );
    ELSE
        v_batch_query := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_inclusive_range_predicate,
            v_version_filter,
            v_name_order
        );

        -- Strict counterpart of the query above: used once the single-row
        -- ASC batch advance (below) has left v_next_seek pointing at the
        -- last row already emitted, so an inclusive predicate would
        -- re-match it forever. Only single-row mode ever sets strict mode,
        -- so this variant is never needed when v_multi_row.
        v_batch_query_strict := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order
        );
    END IF;

    -- The static peek predicates cannot use the partial delete-marker index
    -- once PL/pgSQL switches to a generic plan because whether
    -- is_delete_marker is required remains parameter-dependent. Reuse the
    -- already-specialized batch query with a one-row limit for this sparse
    -- filter so the plan sees a literal `o.is_delete_marker` predicate.
    IF delete_markers = 'only' THEN
        v_delete_marker_peek_query :=
            'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        IF NOT v_multi_row THEN
            v_delete_marker_peek_query_strict :=
                'SELECT marker_page.name FROM (' || v_batch_query_strict || ') marker_page LIMIT 1';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor performs one specialized initial seek so
            -- partial current-version and delete-marker indexes remain available.
            EXECUTE format(
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY o.name COLLATE "C" DESC LIMIT 1',
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND o.name COLLATE "C" >= $2 AND o.name COLLATE "C" < $3'
                    ELSE ''
                END,
                v_version_filter
            )
            INTO v_next_seek
            USING _bucket_id, v_prefix, v_upper_bound;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Folder continuation tokens retain their trailing delimiter. A
        -- delimiter-less startAfter is always a literal key boundary.
        v_cursor_is_folder := delimiter_param <> ''
            AND v_start_relative <> ''
            AND right(v_start_relative, length(delimiter_param)) = delimiter_param;

        IF v_cursor_is_folder THEN
            v_next_seek := CASE
                WHEN right(v_start, length(delimiter_param)) = delimiter_param
                    THEN v_start
                ELSE v_start || delimiter_param
            END;
            IF v_is_asc THEN
                v_next_seek := left(v_next_seek, -1)
                    || chr(ascii(right(v_next_seek, 1)) + 1);
            END IF;
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- leaf object: when v_multi_row, stay on v_start with the
            -- caller-supplied tiebreak so a page boundary mid-key resumes
            -- that key's remaining rows instead of skipping them. Truncate
            -- to milliseconds like every other v_next_seek_at assignment -
            -- harmless today since object.ts's cursor always round-trips
            -- through JS Date first, but this shouldn't rely on that.
            IF v_multi_row THEN
                v_next_seek := v_start;
                v_next_seek_at := date_trunc('milliseconds', next_token_archived_at);
                v_next_seek_version := coalesce(next_token_version, '');
                v_next_seek_strict := coalesce(next_token, '') = '';
            ELSIF v_is_asc THEN
                v_next_seek := v_start;
                v_next_seek_strict := true;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        -- v_multi_row is branched here (rather than folded into the WHERE
        -- clause as a bound parameter) so each concrete query keeps an
        -- unconditional seek predicate - once PL/pgSQL switches to its
        -- cached generic plan (after 5 calls), a parameter-gated
        -- "(NOT v_multi_row AND name >= $x) OR (v_multi_row AND ...)"
        -- predicate stops the planner from using name as an index
        -- condition at all, degrading every subsequent peek to a full
        -- index scan filtered row-by-row instead of a bounded range scan.
        -- v_multi_row's seek predicate is a keyset tuple comparison
        -- ("name > x OR (name = x AND tiebreak)") - Postgres does not
        -- split this OR into indexable form even with fully literal
        -- values, so it falls back to a full scan filtered row-by-row.
        -- Splitting it into two independently-indexable branches (exact
        -- name match with the tiebreak filter, vs. strictly-past name)
        -- combined with UNION ALL lets each branch keep name as a real
        -- index condition; the outer ORDER BY/LIMIT picks whichever of
        -- the (at most 2) rows sorts first.
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING _bucket_id, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END,
                    1, v_next_seek_at, v_next_seek_version, v_next_seek_strict;
        ELSIF v_multi_row THEN
            IF v_is_asc THEN
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" < v_upper_bound
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek AND o.name COLLATE "C" < v_upper_bound
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" >= v_prefix
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        ELSE
            -- Single-row mode is always noncurrent_versions='exclude'. Keep
            -- this predicate literal so generic plans use the current index.
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.name COLLATE "C" >= v_prefix
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := v_common_prefix;
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            version := NULL;
            archived_at := NULL;
            is_delete_marker := NULL;
            is_versioned := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1)
                    || chr(ascii(right(v_common_prefix, 1)) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row THEN v_batch_query_strict ELSE v_batch_query END
                USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size, v_next_seek_at, v_next_seek_version,
                v_next_seek_strict
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN v_current.name
                        ELSE v_current.name || delimiter_param
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                version := v_current.version;
                archived_at := v_current.archived_at;
                is_delete_marker := v_current.is_delete_marker;
                is_versioned := v_current.is_versioned;
                RETURN NEXT;
                v_count := v_count + 1;

                -- when v_multi_row, stay on this name and record its
                -- archived_at as the new tiebreak so remaining rows for the
                -- same key are picked up before moving to the next name
                IF v_multi_row THEN
                    v_next_seek := v_current.name;
                    v_next_seek_at := COALESCE(date_trunc('milliseconds', v_current.archived_at), 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                    v_next_seek_strict := false;
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor
                    -- would skip a real key like `name || '!'` (or any
                    -- character sorting below the delimiter), which sorts
                    -- between `name` and `name || delimiter`. Track the real
                    -- name and mark the next comparison strict instead.
                    v_next_seek := v_current.name;
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.list_objects_with_delimiter made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text", "noncurrent_versions" "text", "delete_markers" "text", "next_token_archived_at" timestamp with time zone, "next_token_version" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."protect_bucket_control_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  configuration_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_configuration IS NOT NULL
       OR NEW.lifecycle_configuration_generation IS NOT NULL THEN
      IF NOT pg_has_role(current_user, TG_ARGV[0], 'MEMBER') THEN
        RAISE EXCEPTION 'only members of the configured storage service role may insert lifecycle policy state'
          USING ERRCODE = '42501',
                HINT = format(
                  'Insert with both lifecycle columns NULL and configure lifecycle through the Storage API afterward, or insert as a member of %I.',
                  TG_ARGV[0]
                );
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  configuration_changed =
    OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
    OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation;

  IF NOT configuration_changed THEN
    RETURN NEW;
  END IF;

  IF NEW.type IS DISTINCT FROM 'STANDARD' THEN
    RAISE EXCEPTION 'bucket versioning and lifecycle controls require a Standard bucket'
      USING ERRCODE = '0A000';
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     AND NEW.lifecycle_configuration_generation IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     OR NEW.lifecycle_configuration_generation IS NULL
     OR OLD.lifecycle_configuration IS NOT DISTINCT FROM NEW.lifecycle_configuration
     OR OLD.lifecycle_configuration_generation IS NOT DISTINCT FROM NEW.lifecycle_configuration_generation THEN
    RAISE EXCEPTION 'a changed lifecycle policy requires a new non-null generation'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."protect_bucket_control_columns"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text", "noncurrent_versions" "text" DEFAULT 'exclude'::"text", "delete_markers" "text" DEFAULT 'exclude'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb", "version" "text", "archived_at" timestamp with time zone, "is_delete_marker" boolean, "is_versioned" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;
    v_multi_row BOOLEAN;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_count INT := 0;
    v_skipped INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;
    v_previous_skipped INT;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                  AND ($7 != 'exclude' OR objects.archived_at IS NULL)
                  AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
                  AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
                  AND ($8 != 'only' OR objects.is_delete_marker)
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata,
                   NULL::text AS version,
                   NULL::timestamptz AS archived_at,
                   NULL::boolean AS is_delete_marker,
                   NULL::boolean AS is_versioned FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata,
                   version, archived_at, is_delete_marker, is_versioned
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
               AND ($7 != 'exclude' OR objects.archived_at IS NULL)
               AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
               AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
               AND ($8 != 'only' OR objects.is_delete_marker)
             -- name, then version, as tiebreaks so two versions of the same
             -- key tying on the sort column still sort deterministically
             ORDER BY %I %s, name COLLATE "C" %s, COALESCE(version, '') %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order, v_sort_order, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets, noncurrent_versions, delete_markers;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build a resume-safe batch query. The exact-name branch returns remaining
    -- versions after the current (archived_at, version) boundary; the strict
    -- name branch returns subsequent keys. UNION ALL keeps both predicates
    -- independently indexable.
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2 AND lower(o.name) COLLATE "C" < $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 AND lower(o.name) COLLATE "C" >= $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    END IF;

    -- Keep the delete-marker predicate literal so the cached generic
    -- plan can use idx_objects_delete_markers during the main-loop peek.
    IF delete_markers = 'only' THEN
        IF v_multi_row THEN
            v_delete_marker_peek_query :=
                'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        ELSIF v_is_asc THEN
            -- Two separate literal query strings, not one gated by a bound
            -- boolean: folding "$n AND op1 OR NOT $n AND op2" into a single
            -- query defeats the generic plan's ability to push either
            -- comparison into the index. Branching in PL/pgSQL control flow
            -- instead keeps each query's index condition intact.
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" >= $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
            -- Strict variant: used once the single-row ASC batch advance
            -- (below) has left v_next_seek pointing at the last row already
            -- emitted, so a plain >= would re-match it forever.
            v_delete_marker_peek_query_strict :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" > $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
        ELSE
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" < $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" >= $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC performs one specialized initial seek so partial current-version
        -- and delete-marker indexes remain available.
        EXECUTE format(
            'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1',
            CASE WHEN v_upper_bound IS NOT NULL
                THEN ' AND lower(o.name) COLLATE "C" >= $2 AND lower(o.name) COLLATE "C" < $3'
                ELSE ''
            END,
            v_version_filter
        )
        INTO v_peek_name
        USING bucketname, v_prefix_lower, v_upper_bound;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch and
    -- the delete-marker-only path
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;
        v_previous_skipped := v_skipped;

        -- STEP 1: PEEK
        v_peek_name := NULL;
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END,
                    1, v_next_seek_at, v_next_seek_version;
        ELSIF v_multi_row AND v_next_seek_at IS NOT NULL THEN
            SELECT o.name INTO v_peek_name
            FROM storage.objects o
            WHERE o.bucket_id = bucketname
              AND lower(o.name) COLLATE "C" = v_next_seek
              AND (COALESCE(o.archived_at, 'infinity'::timestamptz) < v_next_seek_at
                   OR (COALESCE(o.archived_at, 'infinity'::timestamptz) = v_next_seek_at
                       AND COALESCE(o.version, '') > v_next_seek_version))
              AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
              AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
              AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
              AND (delete_markers != 'only' OR o.is_delete_marker)
            ORDER BY COALESCE(o.archived_at, 'infinity'::timestamptz) DESC,
                     COALESCE(o.version, '') ASC
            LIMIT 1;

            -- The current key is exhausted. Clear its version boundary and
            -- make the following ASC name peek strict. Appending '/' is not a
            -- valid lexical successor because keys ending in characters such
            -- as '!' sort between the exhausted name and name || '/'.
            IF v_peek_name IS NULL THEN
                IF v_is_asc THEN
                    v_next_seek_strict := true;
                END IF;
                v_next_seek_at := NULL;
                v_next_seek_version := '';
            END IF;
        END IF;

        -- Single-row mode is always noncurrent_versions='exclude'. Keep the
        -- current-row predicate literal so generic plans use the current index.
        IF delete_markers != 'only' AND v_peek_name IS NULL AND NOT v_multi_row THEN
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL AND v_is_asc THEN
            IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_next_seek_strict THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- If the peek landed on a different key than we were tracking, any
        -- version boundary belongs to the OLD key and must not leak into the
        -- new one - e.g. the deleteMarkers='only' peek doesn't know or care
        -- whether it's continuing the same key or jumping to a new one, so
        -- it never clears these itself.
        IF lower(v_peek_name) IS DISTINCT FROM v_next_seek THEN
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        END IF;

        -- The peek is authoritative for the next key to process. This is
        -- especially important after exhausting a multi-version key: the
        -- version boundary has been cleared, so executing the batch against
        -- a stale v_next_seek would replay every version of that old key.
        v_next_seek := lower(v_peek_name);
        v_next_seek_strict := false;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                version := NULL;
                archived_at := NULL;
                is_delete_marker := NULL;
                is_versioned := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size,
                    v_next_seek_at, v_next_seek_version
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too - it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN lower(v_current.name)
                        ELSE lower(v_current.name) || v_delimiter
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    version := v_current.version;
                    archived_at := v_current.archived_at;
                    is_delete_marker := v_current.is_delete_marker;
                    is_versioned := v_current.is_versioned;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Multi-row mode must remain on this key until all of its
                -- versions have crossed the internal batch boundary.
                IF v_multi_row THEN
                    v_next_seek := lower(v_current.name);
                    v_next_seek_at := COALESCE(v_current.archived_at, 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor would
                    -- skip a real key like `name || '!'` (or any character
                    -- sorting below the delimiter), which sorts between `name`
                    -- and `name || delimiter`. Track the real name and mark the
                    -- next comparison strict instead - same fix as the
                    -- exhausted-key case above.
                    v_next_seek := lower(v_current.name);
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_skipped = v_previous_skipped
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.search made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text", "noncurrent_versions" "text", "delete_markers" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text", "noncurrent_versions" "text" DEFAULT 'exclude'::"text", "delete_markers" "text" DEFAULT 'exclude'::"text", "p_start_after_version" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb", "version" "text", "archived_at" timestamp with time zone, "is_delete_marker" boolean, "is_versioned" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_prefix_pattern text;
    v_sort_order text;
    v_sort_column text;
    v_version_tiebreak text;
BEGIN
    v_prefix := coalesce(p_prefix, '');
    -- Keep the raw prefix for common-prefix calculations and escape only LIKE metacharacters.
    v_prefix_pattern := replace(v_prefix, chr(92), chr(92) || chr(92));
    v_prefix_pattern := replace(v_prefix_pattern, '%', chr(92) || '%');
    v_prefix_pattern := replace(v_prefix_pattern, '_', chr(92) || '_');

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    -- $9 is only populated in multi-row mode; it's always '' otherwise, so
    -- only use each row's real version as a tiebreak in multi-row mode.
    v_version_tiebreak := CASE WHEN noncurrent_versions IN ('only', 'include') THEN 'COALESCE(version, '''')' ELSE '''''' END;

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                o.version AS obj_version,
                o.archived_at AS obj_archived_at,
                o.is_delete_marker AS obj_is_delete_marker,
                o.is_versioned AS obj_is_versioned,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $10 || '%%'
              AND ($7 != 'exclude' OR o.archived_at IS NULL)
              AND ($7 != 'only' OR o.archived_at IS NOT NULL)
              AND ($8 != 'exclude' OR NOT o.is_delete_marker)
              AND ($8 != 'only' OR o.is_delete_marker)
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                common_prefix AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                NULL::text AS version,
                NULL::timestamptz AS archived_at,
                NULL::boolean AS is_delete_marker,
                NULL::boolean AS is_versioned,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                obj_version AS version,
                obj_archived_at AS archived_at,
                obj_is_delete_marker AS is_delete_marker,
                obj_is_versioned AS is_versioned,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz),
                    name COLLATE "C",
                    %s
                ) %s ROW(
                    -- truncated the same way as the stored value above
                    date_trunc('milliseconds', COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz)),
                    $5,
                    $9
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata,
            version,
            archived_at,
            is_delete_marker,
            is_versioned
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s,
            COALESCE(version, '') %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_version_tiebreak,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order,
        v_sort_order
    );

    -- version is the third tiebreak component for two versions of the same
    -- key tying on both timestamp and name (see filtered CTE / ORDER BY above)
    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after, noncurrent_versions, delete_markers, coalesce(p_start_after_version, ''), v_prefix_pattern;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text", "noncurrent_versions" "text", "delete_markers" "text", "p_start_after_version" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text", "noncurrent_versions" "text" DEFAULT 'exclude'::"text", "delete_markers" "text" DEFAULT 'exclude'::"text", "start_after_archived_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "start_after_version" "text" DEFAULT ''::"text", "start_after_is_continuation" boolean DEFAULT false) RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb", "version" "text", "archived_at" timestamp with time zone, "is_delete_marker" boolean, "is_versioned" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata,
            l.version,
            l.archived_at,
            l.is_delete_marker,
            l.is_versioned
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            CASE WHEN start_after_is_continuation THEN '' ELSE start_after END,
            CASE WHEN start_after_is_continuation THEN start_after ELSE '' END,
            v_sort_ord,
            noncurrent_versions,
            delete_markers,
            start_after_archived_at,
            start_after_version
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after,
            noncurrent_versions, delete_markers, start_after_version
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text", "noncurrent_versions" "text", "delete_markers" "text", "start_after_archived_at" timestamp with time zone, "start_after_version" "text", "start_after_is_continuation" boolean) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'New conversation'::"text" NOT NULL,
    "provider" "text" DEFAULT 'openai'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_conversations_provider_check" CHECK (("provider" = ANY (ARRAY['openai'::"text", 'claude'::"text", 'gemini'::"text"])))
);


ALTER TABLE "public"."ai_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."ai_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "publish_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applicants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "role_applied_for" "text",
    "stage" "text" DEFAULT 'Screening'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "phone" "text",
    "message" "text",
    "location" "text",
    "cv_url" "text",
    "cv_name" "text",
    "cover_note" "text",
    "posting_id" "uuid",
    "photo_url" "text",
    "linkedin" "text",
    "cover_letter" "text",
    "skills" "text",
    "company_id" "uuid",
    CONSTRAINT "applicants_stage_check" CHECK (("stage" = ANY (ARRAY['Screening'::"text", 'Interview'::"text", 'Offer'::"text", 'Hired'::"text"])))
);


ALTER TABLE "public"."applicants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_payment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "initiated_by" "uuid" NOT NULL,
    "plan_code" "text" NOT NULL,
    "amount_kobo" bigint NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "reference" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "checkout_url" "text",
    "failure_message" "text",
    "paystack_transaction_id" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_provider" "text",
    "flutterwave_transaction_id" "text",
    CONSTRAINT "billing_payment_attempts_amount_kobo_check" CHECK (("amount_kobo" > 0)),
    CONSTRAINT "billing_payment_attempts_currency_check" CHECK (("currency" = 'NGN'::"text")),
    CONSTRAINT "billing_payment_attempts_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['basic'::"text", 'standard'::"text", 'premium'::"text"]))),
    CONSTRAINT "billing_payment_attempts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."billing_payment_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_cargo_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "description" "text",
    "quantity" "text",
    "gross_weight" "text",
    "unit" "text",
    "rate_class" "text",
    "chargeable_weight" "text",
    "company_id" "uuid"
);


ALTER TABLE "public"."booking_cargo_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."booking_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."booking_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tracking_no" "text" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "origin" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "pickup_date" "date" NOT NULL,
    "weight" "text",
    "declared_value" numeric(14,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sender_name" "text",
    "sender_address" "text",
    "sender_email" "text",
    "sender_phone" "text",
    "receiver_name" "text",
    "receiver_address" "text",
    "receiver_phone" "text",
    "vehicle_number" "text",
    "driver_name" "text",
    "driver_phone" "text",
    "checked_by" "text",
    "dispatched_by" "text",
    "declared_value_customs" "text",
    "insurance_amount" numeric,
    "freight_terms" "text",
    "user_id" "uuid",
    "company_id" "uuid",
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Assigned'::"text", 'In Transit'::"text", 'Delivered'::"text", 'Exception'::"text", 'Cancelled'::"text"]))),
    CONSTRAINT "bookings_type_check" CHECK (("type" = ANY (ARRAY['Road'::"text", 'Haulage'::"text", 'Air'::"text", 'Sea'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."career_postings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "location" "text" DEFAULT 'Lagos, Nigeria'::"text" NOT NULL,
    "employment_type" "text" DEFAULT 'Full-time'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."career_postings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "body" "text",
    "image_url" "text",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    CONSTRAINT "chat_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['visitor'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visitor_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."chat_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clock_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "clock_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clock_out" timestamp with time zone,
    "notes" "text",
    "duration_minutes" integer GENERATED ALWAYS AS (
CASE
    WHEN ("clock_out" IS NOT NULL) THEN ((EXTRACT(epoch FROM ("clock_out" - "clock_in")))::integer / 60)
    ELSE NULL::integer
END) STORED,
    "paused_at" timestamp with time zone,
    "paused_seconds" bigint DEFAULT 0 NOT NULL,
    "idle_seconds" bigint DEFAULT 0 NOT NULL,
    "pause_reason" "text",
    "company_id" "uuid",
    CONSTRAINT "clock_entries_idle_seconds_nonnegative" CHECK (("idle_seconds" >= 0)),
    CONSTRAINT "clock_entries_paused_seconds_nonnegative" CHECK (("paused_seconds" >= 0))
);


ALTER TABLE "public"."clock_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_subscriptions" (
    "company_id" "uuid" NOT NULL,
    "plan_code" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "amount_kobo" bigint NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "last_payment_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_subscriptions_amount_kobo_check" CHECK (((("status" = 'trialing'::"text") AND ("amount_kobo" = 0)) OR (("status" <> 'trialing'::"text") AND ("amount_kobo" > 0)))),
    CONSTRAINT "company_subscriptions_period_check" CHECK (("current_period_end" > "current_period_start")),
    CONSTRAINT "company_subscriptions_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['basic'::"text", 'standard'::"text", 'premium'::"text"]))),
    CONSTRAINT "company_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'cancelled'::"text", 'expired'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."company_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_workspace_settings" (
    "company_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "tax_rate" numeric(7,3) DEFAULT 7.5 NOT NULL,
    "business_address" "text" DEFAULT ''::"text" NOT NULL,
    "logo_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_workspace_settings_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "company_workspace_settings_tax_rate_check" CHECK ((("tax_rate" >= (0)::numeric) AND ("tax_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."company_workspace_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_sheet_cells" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sheet_id" "uuid" NOT NULL,
    "row_index" integer NOT NULL,
    "col_index" integer NOT NULL,
    "value" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "style" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."crm_sheet_cells" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_sheet_tabs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "column_widths" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "row_heights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."crm_sheet_tabs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_erp_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_customer_id" "uuid" NOT NULL,
    "company" "text" DEFAULT ''::"text" NOT NULL,
    "contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'New'::"text" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_erp_leads_status_check" CHECK (("status" = ANY (ARRAY['New'::"text", 'Contacted'::"text", 'Qualified'::"text", 'Won'::"text", 'Lost'::"text"])))
);


ALTER TABLE "public"."customer_erp_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sku" "text",
    "item_name" "text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "location" "text",
    "reorder_threshold" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "details" "text",
    "unit_cost" numeric DEFAULT 0
);


ALTER TABLE "public"."customer_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_lead_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "author_name" "text",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_lead_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "company" "text",
    "contact" "text",
    "status" "text" DEFAULT 'New'::"text" NOT NULL,
    "priority" "text" DEFAULT 'Medium'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "job_title" "text",
    "email" "text",
    "phone" "text",
    "source" "text",
    "transport_mode" "text",
    "origin" "text",
    "destination" "text",
    "deal_value" numeric DEFAULT 0,
    "call_back_date" "date"
);


ALTER TABLE "public"."customer_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" DEFAULT ''::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_own_invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."customer_own_invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_own_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "invoice_no" "text" NOT NULL,
    "client_name" "text" NOT NULL,
    "logo_url" "text",
    "subtotal" numeric DEFAULT 0 NOT NULL,
    "tax" numeric DEFAULT 0 NOT NULL,
    "total" numeric DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Unpaid'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "currency" "text" DEFAULT 'NGN'::"text"
);


ALTER TABLE "public"."customer_own_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" DEFAULT 'Customer Service'::"text" NOT NULL,
    "status" "text" DEFAULT 'Invited'::"text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "permitted_modules" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status_changed_at" timestamp with time zone,
    "status_changed_by" "text",
    "removed_at" timestamp with time zone
);


ALTER TABLE "public"."customer_team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'B2B'::"text" NOT NULL,
    "contact" "text",
    "credit_limit" numeric(14,2) DEFAULT 0 NOT NULL,
    "balance" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "client_since" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_to" "uuid",
    "user_id" "uuid",
    "email" "text",
    "phone" "text",
    "avatar_url" "text",
    "currency" "text" DEFAULT 'NGN'::"text",
    "timezone" "text" DEFAULT 'Africa/Lagos'::"text",
    "tax_rate" numeric DEFAULT 7.5 NOT NULL,
    "deactivation_reason" "text",
    "deactivated_at" timestamp with time zone,
    "deactivated_by" "text",
    "logo_url" "text",
    "support_phone" "text",
    "subscription_status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "address" "text",
    "company_name" "text",
    "business_address" "text",
    "company_id" "uuid",
    CONSTRAINT "customers_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'On hold'::"text", 'Inactive'::"text"]))),
    CONSTRAINT "customers_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['inactive'::"text", 'active'::"text", 'past_due'::"text"]))),
    CONSTRAINT "customers_type_check" CHECK (("type" = ANY (ARRAY['B2B'::"text", 'B2C'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."tax_rate" IS 'Tenant-configured tax percentage; 7.5 represents 7.5 percent.';



COMMENT ON COLUMN "public"."customers"."logo_url" IS 'Tenant-owned logo used in the customer workspace and newly created invoices.';



CREATE TABLE IF NOT EXISTS "public"."driver_onboarding_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."driver_onboarding_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "license_no" "text",
    "license_expiry" "date",
    "status" "text" DEFAULT 'Available'::"text" NOT NULL,
    "trips_completed" integer DEFAULT 0 NOT NULL,
    "rating" numeric(2,1),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "communication_rating" integer,
    "punctuality_rating" integer,
    "neatness_rating" integer,
    "composure_rating" integer,
    "phone" "text",
    "email" "text",
    "address" "text",
    "date_of_birth" "date",
    "gender" "text",
    "nationality" "text",
    "blood_group" "text",
    "next_of_kin_name" "text",
    "next_of_kin_relationship" "text",
    "next_of_kin_phone" "text",
    "next_of_kin_address" "text",
    "previous_employer" "text",
    "previous_employer_phone" "text",
    "previous_employer_address" "text",
    "previous_employment_start" "date",
    "previous_employment_end" "date",
    "id_type" "text",
    "id_number" "text",
    "photo_path" "text",
    "id_document_path" "text",
    "license_document_path" "text",
    "emergency_notes" "text",
    "onboarding_token" "text",
    "onboarding_expires_at" timestamp with time zone,
    "company_id" "uuid",
    CONSTRAINT "drivers_status_check" CHECK (("status" = ANY (ARRAY['Available'::"text", 'On trip'::"text", 'Off duty'::"text"])))
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "letter_type" "text" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'Sent'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employee_letters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "rater_id" "uuid" NOT NULL,
    "appearance" smallint NOT NULL,
    "behavior" smallint NOT NULL,
    "communication" smallint NOT NULL,
    "teamwork" smallint NOT NULL,
    "reliability" smallint NOT NULL,
    "leadership" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_ratings_appearance_check" CHECK ((("appearance" >= 1) AND ("appearance" <= 5))),
    CONSTRAINT "employee_ratings_behavior_check" CHECK ((("behavior" >= 1) AND ("behavior" <= 5))),
    CONSTRAINT "employee_ratings_communication_check" CHECK ((("communication" >= 1) AND ("communication" <= 5))),
    CONSTRAINT "employee_ratings_leadership_check" CHECK ((("leadership" >= 1) AND ("leadership" <= 5))),
    CONSTRAINT "employee_ratings_reliability_check" CHECK ((("reliability" >= 1) AND ("reliability" <= 5))),
    CONSTRAINT "employee_ratings_teamwork_check" CHECK ((("teamwork" >= 1) AND ("teamwork" <= 5)))
);


ALTER TABLE "public"."employee_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "department" "text",
    "role_title" "text",
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "email" "text",
    "phone" "text",
    "hired_year" "text",
    "photo_url" "text",
    "gross_pay" numeric(14,2),
    "deductions" numeric(14,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offer_letter_url" "text",
    "votes" integer DEFAULT 0,
    "offer_heading" "text",
    "employee_id" "text",
    "last_residence" "text",
    "current_residence" "text",
    "city" "text",
    "state" "text",
    "passport_url" "text",
    "signature_url" "text",
    "id_document_url" "text",
    "location" "text",
    "date_of_birth" "date",
    "nationality" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "passport_path" "text",
    "signature_path" "text",
    "id_document_path" "text",
    "address" "text",
    "lga" "text",
    "gender" "text",
    "marital_status" "text",
    "nin_number" "text",
    "passport_number" "text",
    "employment_date" "date",
    "next_of_kin_name" "text",
    "next_of_kin_phone" "text",
    "next_of_kin_address" "text",
    "next_of_kin" "text",
    "emergency_contact" "text",
    "emergency_phone" "text",
    "passport_photo_url" "text",
    "company_id" "uuid",
    CONSTRAINT "employees_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Inactive'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."employee_recognition_public" AS
 SELECT "id",
    "name",
    "department",
    "role_title",
    "votes"
   FROM "public"."employees";


ALTER VIEW "public"."employee_recognition_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_year_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "appearance" integer NOT NULL,
    "behavior" integer NOT NULL,
    "communication" integer NOT NULL,
    "teamwork" integer NOT NULL,
    "reliability" integer NOT NULL,
    "leadership" integer NOT NULL,
    "total_score" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_year_votes_appearance_check" CHECK ((("appearance" >= 1) AND ("appearance" <= 5))),
    CONSTRAINT "employee_year_votes_behavior_check" CHECK ((("behavior" >= 1) AND ("behavior" <= 5))),
    CONSTRAINT "employee_year_votes_communication_check" CHECK ((("communication" >= 1) AND ("communication" <= 5))),
    CONSTRAINT "employee_year_votes_leadership_check" CHECK ((("leadership" >= 1) AND ("leadership" <= 5))),
    CONSTRAINT "employee_year_votes_reliability_check" CHECK ((("reliability" >= 1) AND ("reliability" <= 5))),
    CONSTRAINT "employee_year_votes_teamwork_check" CHECK ((("teamwork" >= 1) AND ("teamwork" <= 5)))
);


ALTER TABLE "public"."employee_year_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."expense_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "vendor" "text" NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'Unpaid'::"text" NOT NULL,
    "company_id" "uuid",
    CONSTRAINT "expenses_status_check" CHECK (("status" = ANY (ARRAY['Paid'::"text", 'Unpaid'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fleet_insurance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid",
    "insurer" "text" NOT NULL,
    "policy_number" "text",
    "coverage_type" "text",
    "premium" numeric,
    "start_date" "date",
    "expiry_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fleet_insurance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fleet_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid",
    "description" "text" NOT NULL,
    "cost" numeric,
    "service_date" "date",
    "status" "text" DEFAULT 'Scheduled'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raised_by" "uuid",
    "company_id" "uuid"
);


ALTER TABLE "public"."fleet_maintenance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fleet_vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plate" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'Available'::"text" NOT NULL,
    "driver_id" "uuid",
    "next_service_date" "date",
    "fuel_liters" numeric(10,2) DEFAULT 0,
    "insurer" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "insurance_expiry" "date",
    "company_id" "uuid",
    CONSTRAINT "fleet_vehicles_status_check" CHECK (("status" = ANY (ARRAY['Available'::"text", 'In Transit'::"text", 'Maintenance'::"text", 'Out of service'::"text", 'Idle'::"text"])))
);


ALTER TABLE "public"."fleet_vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gmail_connections" (
    "user_id" "uuid" NOT NULL,
    "gmail_address" "text" NOT NULL,
    "encrypted_refresh_token" "text" NOT NULL,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gmail_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_calendar_tokens" (
    "user_id" "uuid" NOT NULL,
    "access_token" "text",
    "refresh_token" "text" NOT NULL,
    "expiry_date" bigint,
    "scope" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."google_calendar_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "channel" "text" DEFAULT 'Employee dashboard'::"text" NOT NULL,
    "subject" "text",
    "body" "text" NOT NULL,
    "recipient_email" "text",
    "status" "text" DEFAULT 'Prepared'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "reorder_level" integer DEFAULT 0 NOT NULL,
    "location" "text",
    "status" "text" DEFAULT 'In stock'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "storage_type" "text" DEFAULT 'Ambient'::"text",
    "zone" "text",
    "rack" "text",
    "bin" "text",
    "unit" "text" DEFAULT 'units'::"text",
    "batch_no" "text",
    "expiry_date" "date",
    "supplier" "text",
    "temperature_c" numeric,
    "notes" "text",
    "description" "text",
    "reorder_qty" numeric,
    "company_id" "uuid",
    CONSTRAINT "inventory_items_status_check" CHECK (("status" = ANY (ARRAY['In stock'::"text", 'Low stock'::"text"]))),
    CONSTRAINT "inventory_items_storage_type_check" CHECK (("storage_type" = ANY (ARRAY['Ambient'::"text", 'Cold Room'::"text", 'Frozen'::"text", 'Secure'::"text", 'Quarantine'::"text", 'Oversize'::"text"])))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_branding" (
    "company_id" "uuid" NOT NULL,
    "legal_name" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "website" "text" DEFAULT ''::"text" NOT NULL,
    "logo_path" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_branding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_no" "text" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "invoice_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "linked_booking_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "posted" boolean DEFAULT false NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 7.50 NOT NULL,
    "tax_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "company_id" "uuid",
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['Paid'::"text", 'Pending'::"text", 'Overdue'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jaad_platform_config" (
    "singleton" boolean DEFAULT true NOT NULL,
    "crm_company_id" "uuid" NOT NULL,
    CONSTRAINT "jaad_platform_config_singleton_check" CHECK ("singleton")
);


ALTER TABLE "public"."jaad_platform_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kb_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kb_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "author_name" "text" NOT NULL,
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."lead_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "job_title" "text",
    "email" "text",
    "phone" "text" NOT NULL,
    "source" "text",
    "industry" "text",
    "priority" "text" DEFAULT 'Warm'::"text" NOT NULL,
    "status" "text" DEFAULT 'New'::"text" NOT NULL,
    "assigned_to" "uuid",
    "follow_up_date" "date",
    "transport_mode" "text",
    "cargo_type" "text",
    "origin" "text",
    "destination" "text",
    "frequency" "text",
    "volume_weight" "text",
    "current_provider" "text",
    "requirements" "text",
    "value" numeric(14,2) DEFAULT 0 NOT NULL,
    "linked_customer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "callback_date" "date",
    "company_id" "uuid",
    "registration_user_id" "uuid",
    CONSTRAINT "leads_frequency_check" CHECK (("frequency" = ANY (ARRAY['One-time'::"text", 'Weekly'::"text", 'Monthly'::"text", 'Quarterly'::"text", 'Other'::"text"]))),
    CONSTRAINT "leads_priority_check" CHECK (("priority" = ANY (ARRAY['Hot'::"text", 'Warm'::"text", 'Cold'::"text"]))),
    CONSTRAINT "leads_source_check" CHECK (("source" = ANY (ARRAY['Website'::"text", 'Referral'::"text", 'Cold Call'::"text", 'Social Media'::"text", 'Trade Show'::"text", 'Other'::"text"]))),
    CONSTRAINT "leads_status_check" CHECK (("status" = ANY (ARRAY['New'::"text", 'Contacted'::"text", 'Qualified'::"text", 'Proposal Sent'::"text", 'Won'::"text", 'Lost'::"text"]))),
    CONSTRAINT "leads_transport_mode_check" CHECK (("transport_mode" = ANY (ARRAY['Trucks / Haulage'::"text", 'RORO'::"text", 'Sea Freight'::"text", 'Air Freight'::"text", 'Cargo'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "employee_name" "text" NOT NULL,
    "leave_type" "text" NOT NULL,
    "from_date" "date" NOT NULL,
    "to_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Requested'::"text" NOT NULL,
    "reason" "text",
    "requested_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "letter_url" "text",
    "leave_heading" "text",
    "company_id" "uuid",
    CONSTRAINT "leave_requests_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Awaiting Approval'::"text", 'Approved'::"text", 'Declined'::"text"])))
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "sender" "text" DEFAULT 'agent'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."live_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_name" "text" NOT NULL,
    "status" "text" DEFAULT 'Open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "customer_email" "text",
    "customer_phone" "text",
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."live_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manifest_bookings" (
    "manifest_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL
);


ALTER TABLE "public"."manifest_bookings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."manifest_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."manifest_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manifest_shipments" (
    "manifest_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL
);


ALTER TABLE "public"."manifest_shipments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manifests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manifest_no" "text" NOT NULL,
    "manifest_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "driver_id" "uuid",
    "driver_name" "text",
    "vehicle_id" "uuid",
    "vehicle_plate" "text",
    "route" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vehicle_number" "text",
    "company_id" "uuid"
);


ALTER TABLE "public"."manifests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role_id" "uuid",
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "company_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Suspended'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proof_of_delivery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "received_by" "text",
    "delivered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_by" "uuid",
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "company_id" "uuid",
    CONSTRAINT "proof_of_delivery_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Resolved'::"text"])))
);


ALTER TABLE "public"."proof_of_delivery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_no" "text" NOT NULL,
    "supplier" "text" NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "items_description" "text",
    "po_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "order_date" "date" DEFAULT CURRENT_DATE,
    "category" "text" DEFAULT 'General'::"text",
    "requested_by" "text",
    "expected_date" "date",
    "payment_terms" "text",
    "priority" "text" DEFAULT 'Normal'::"text",
    "company_id" "uuid",
    CONSTRAINT "purchase_orders_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Ordered'::"text", 'Received'::"text"])))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "qty" numeric(10,2) DEFAULT 1 NOT NULL,
    "rate" numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ref" "text" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "contact" "text",
    "route" "text",
    "mode" "text",
    "quote_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "valid_until" "date",
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference" "text",
    "amount" numeric DEFAULT 0,
    "company_id" "uuid",
    CONSTRAINT "quotations_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Approved'::"text", 'Rejected'::"text"])))
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "tracking_no" "text" NOT NULL,
    "customer_name" "text",
    "reason" "text",
    "status" "text" DEFAULT 'Open'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_by" "uuid",
    "company_id" "uuid",
    CONSTRAINT "returns_status_check" CHECK (("status" = ANY (ARRAY['Open'::"text", 'Resolved'::"text"])))
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permitted_modules" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sheet_cells" (
    "row_index" integer NOT NULL,
    "col_index" integer NOT NULL,
    "value" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid"
);


ALTER TABLE "public"."sheet_cells" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text" NOT NULL,
    "status" "text" DEFAULT 'Logged'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "twilio_call_sid" "text",
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."support_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "direction" "text" DEFAULT 'outbound'::"text" NOT NULL,
    "to_address" "text" NOT NULL,
    "from_address" "text" DEFAULT 'support@jaadlogistics.com.ng'::"text" NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'Sent'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "customer_user_id" "uuid",
    "scheduled_at" timestamp with time zone,
    "provider_email_id" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "gmail_account" "text",
    "gmail_message_id" "text",
    "gmail_thread_id" "text",
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."support_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_inbound_addresses" (
    "address" "text" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_inbound_addresses_lower" CHECK (("address" = "lower"(TRIM(BOTH FROM "address"))))
);


ALTER TABLE "public"."support_inbound_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_sms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "to_number" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'Logged'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "from_number" "text",
    "direction" "text" DEFAULT 'outbound'::"text" NOT NULL,
    "provider_sid" "text",
    "error_code" "text",
    "status_message" "text",
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."support_sms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_whatsapp" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "to_number" "text" NOT NULL,
    "message" "text" NOT NULL,
    "direction" "text" DEFAULT 'outbound'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."support_whatsapp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_name" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipient_name" "text",
    "read_at" timestamp with time zone,
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"()
);


ALTER TABLE "public"."team_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_no" "text" NOT NULL,
    "customer_name" "text",
    "subject" "text" NOT NULL,
    "priority" "text" DEFAULT 'Normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'Open'::"text" NOT NULL,
    "channel" "text",
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "message" "text",
    "company_id" "uuid" DEFAULT "public"."jaad_current_company_id"(),
    CONSTRAINT "tickets_channel_check" CHECK (("channel" = ANY (ARRAY['WhatsApp'::"text", 'Call'::"text", 'Email'::"text", 'Web chat'::"text"]))),
    CONSTRAINT "tickets_priority_check" CHECK (("priority" = ANY (ARRAY['Low'::"text", 'Normal'::"text", 'High'::"text", 'Urgent'::"text"]))),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['Open'::"text", 'Resolved'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracking_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."tracking_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL,
    "versioning_status" "text" DEFAULT 'DISABLED'::"text" NOT NULL,
    "lifecycle_configuration" "jsonb",
    "lifecycle_configuration_generation" "uuid",
    CONSTRAINT "buckets_lifecycle_configuration_pair_check" CHECK ((("lifecycle_configuration" IS NULL) = ("lifecycle_configuration_generation" IS NULL))),
    CONSTRAINT "buckets_lifecycle_configuration_shape_check" CHECK ((("lifecycle_configuration" IS NULL) OR (("jsonb_typeof"("lifecycle_configuration") = 'object'::"text") AND ("lifecycle_configuration" ? 'rules'::"text") AND
CASE
    WHEN ("jsonb_typeof"(("lifecycle_configuration" -> 'rules'::"text")) = 'array'::"text") THEN (("jsonb_array_length"(("lifecycle_configuration" -> 'rules'::"text")) >= 1) AND ("jsonb_array_length"(("lifecycle_configuration" -> 'rules'::"text")) <= 1000))
    ELSE false
END))),
    CONSTRAINT "buckets_lifecycle_configuration_standard_only_check" CHECK ((("type" = 'STANDARD'::"storage"."buckettype") OR (("lifecycle_configuration" IS NULL) AND ("lifecycle_configuration_generation" IS NULL)))),
    CONSTRAINT "buckets_versioning_dark_check" CHECK (("versioning_status" = 'DISABLED'::"text")),
    CONSTRAINT "buckets_versioning_standard_only_check" CHECK ((("type" = 'STANDARD'::"storage"."buckettype") OR ("versioning_status" = 'DISABLED'::"text"))),
    CONSTRAINT "buckets_versioning_status_check" CHECK (("versioning_status" = ANY (ARRAY['DISABLED'::"text", 'ENABLED'::"text", 'SUSPENDED'::"text"])))
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "archived_at" timestamp with time zone,
    "is_delete_marker" boolean DEFAULT false NOT NULL,
    "is_versioned" boolean DEFAULT false NOT NULL
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applicants"
    ADD CONSTRAINT "applicants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_payment_attempts"
    ADD CONSTRAINT "billing_payment_attempts_paystack_transaction_id_key" UNIQUE ("paystack_transaction_id");



ALTER TABLE ONLY "public"."billing_payment_attempts"
    ADD CONSTRAINT "billing_payment_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_payment_attempts"
    ADD CONSTRAINT "billing_payment_attempts_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."booking_cargo_items"
    ADD CONSTRAINT "booking_cargo_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_tracking_no_key" UNIQUE ("tracking_no");



ALTER TABLE ONLY "public"."career_postings"
    ADD CONSTRAINT "career_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_threads"
    ADD CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clock_entries"
    ADD CONSTRAINT "clock_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_user_id_key" UNIQUE ("owner_user_id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_subscriptions"
    ADD CONSTRAINT "company_subscriptions_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."company_workspace_settings"
    ADD CONSTRAINT "company_workspace_settings_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."crm_sheet_cells"
    ADD CONSTRAINT "crm_sheet_cells_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_sheet_cells"
    ADD CONSTRAINT "crm_sheet_cells_sheet_id_row_index_col_index_key" UNIQUE ("sheet_id", "row_index", "col_index");



ALTER TABLE ONLY "public"."crm_sheet_tabs"
    ADD CONSTRAINT "crm_sheet_tabs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_erp_leads"
    ADD CONSTRAINT "customer_erp_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_inventory"
    ADD CONSTRAINT "customer_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_lead_notes"
    ADD CONSTRAINT "customer_lead_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_leads"
    ADD CONSTRAINT "customer_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_notes"
    ADD CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_own_invoice_items"
    ADD CONSTRAINT "customer_own_invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_own_invoices"
    ADD CONSTRAINT "customer_own_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_team_members"
    ADD CONSTRAINT "customer_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_onboarding_links"
    ADD CONSTRAINT "driver_onboarding_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_onboarding_links"
    ADD CONSTRAINT "driver_onboarding_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_letters"
    ADD CONSTRAINT "employee_letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_ratings"
    ADD CONSTRAINT "employee_ratings_employee_id_rater_id_key" UNIQUE ("employee_id", "rater_id");



ALTER TABLE ONLY "public"."employee_ratings"
    ADD CONSTRAINT "employee_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_year_votes"
    ADD CONSTRAINT "employee_year_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleet_insurance"
    ADD CONSTRAINT "fleet_insurance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleet_maintenance"
    ADD CONSTRAINT "fleet_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleet_vehicles"
    ADD CONSTRAINT "fleet_vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleet_vehicles"
    ADD CONSTRAINT "fleet_vehicles_plate_key" UNIQUE ("plate");



ALTER TABLE ONLY "public"."gmail_connections"
    ADD CONSTRAINT "gmail_connections_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."google_calendar_tokens"
    ADD CONSTRAINT "google_calendar_tokens_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."hr_documents"
    ADD CONSTRAINT "hr_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."invoice_branding"
    ADD CONSTRAINT "invoice_branding_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_no_key" UNIQUE ("invoice_no");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jaad_platform_config"
    ADD CONSTRAINT "jaad_platform_config_pkey" PRIMARY KEY ("singleton");



ALTER TABLE ONLY "public"."kb_articles"
    ADD CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_notes"
    ADD CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_chats"
    ADD CONSTRAINT "live_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manifest_bookings"
    ADD CONSTRAINT "manifest_bookings_pkey" PRIMARY KEY ("manifest_id", "booking_id");



ALTER TABLE ONLY "public"."manifest_shipments"
    ADD CONSTRAINT "manifest_shipments_pkey" PRIMARY KEY ("manifest_id", "booking_id");



ALTER TABLE ONLY "public"."manifests"
    ADD CONSTRAINT "manifests_manifest_no_key" UNIQUE ("manifest_no");



ALTER TABLE ONLY "public"."manifests"
    ADD CONSTRAINT "manifests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proof_of_delivery"
    ADD CONSTRAINT "proof_of_delivery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_po_no_key" UNIQUE ("po_no");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_ref_key" UNIQUE ("ref");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sheet_cells"
    ADD CONSTRAINT "sheet_cells_pkey" PRIMARY KEY ("row_index", "col_index");



ALTER TABLE ONLY "public"."support_calls"
    ADD CONSTRAINT "support_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_emails"
    ADD CONSTRAINT "support_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_inbound_addresses"
    ADD CONSTRAINT "support_inbound_addresses_pkey" PRIMARY KEY ("address");



ALTER TABLE ONLY "public"."support_sms"
    ADD CONSTRAINT "support_sms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_whatsapp"
    ADD CONSTRAINT "support_whatsapp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_chat_messages"
    ADD CONSTRAINT "team_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ticket_no_key" UNIQUE ("ticket_no");



ALTER TABLE ONLY "public"."tracking_events"
    ADD CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_conversations_user_updated_idx" ON "public"."ai_conversations" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "ai_messages_conversation_created_idx" ON "public"."ai_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "announcements_expires_at_idx" ON "public"."announcements" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "announcements_publish_at_desc_idx" ON "public"."announcements" USING "btree" ("publish_at" DESC);



CREATE INDEX "applicants_email_idx" ON "public"."applicants" USING "btree" ("email");



CREATE INDEX "applicants_posting_id_idx" ON "public"."applicants" USING "btree" ("posting_id");



CREATE INDEX "applicants_stage_idx" ON "public"."applicants" USING "btree" ("stage");



CREATE INDEX "audit_log_actor_id_idx" ON "public"."audit_log" USING "btree" ("actor_id");



CREATE INDEX "audit_log_created_at_desc_idx" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "billing_payment_attempts_company_created_idx" ON "public"."billing_payment_attempts" USING "btree" ("company_id", "created_at" DESC);



CREATE UNIQUE INDEX "billing_payment_attempts_flutterwave_tx_unique" ON "public"."billing_payment_attempts" USING "btree" ("flutterwave_transaction_id") WHERE ("flutterwave_transaction_id" IS NOT NULL);



CREATE INDEX "billing_payment_attempts_status_idx" ON "public"."billing_payment_attempts" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "booking_cargo_items_tenant_company_idx" ON "public"."booking_cargo_items" USING "btree" ("company_id");



CREATE INDEX "bookings_tenant_company_idx" ON "public"."bookings" USING "btree" ("company_id");



CREATE INDEX "bookings_user_id_idx" ON "public"."bookings" USING "btree" ("user_id");



CREATE INDEX "clock_entries_tenant_company_idx" ON "public"."clock_entries" USING "btree" ("company_id");



CREATE INDEX "crm_sheet_cells_tenant_company_idx" ON "public"."crm_sheet_cells" USING "btree" ("company_id");



CREATE INDEX "crm_sheet_tabs_tenant_company_idx" ON "public"."crm_sheet_tabs" USING "btree" ("company_id");



CREATE INDEX "customer_erp_leads_tenant_idx" ON "public"."customer_erp_leads" USING "btree" ("tenant_customer_id", "created_at" DESC);



CREATE INDEX "customer_inventory_user_id_idx" ON "public"."customer_inventory" USING "btree" ("user_id");



CREATE INDEX "customer_leads_user_id_idx" ON "public"."customer_leads" USING "btree" ("user_id");



CREATE INDEX "customer_own_invoices_user_id_idx" ON "public"."customer_own_invoices" USING "btree" ("user_id");



CREATE INDEX "driver_onboarding_links_driver_idx" ON "public"."driver_onboarding_links" USING "btree" ("driver_id");



CREATE INDEX "driver_onboarding_links_token_idx" ON "public"."driver_onboarding_links" USING "btree" ("token");



CREATE UNIQUE INDEX "drivers_onboarding_token_idx" ON "public"."drivers" USING "btree" ("onboarding_token") WHERE ("onboarding_token" IS NOT NULL);



CREATE INDEX "drivers_tenant_company_idx" ON "public"."drivers" USING "btree" ("company_id");



CREATE INDEX "employee_letters_employee_idx" ON "public"."employee_letters" USING "btree" ("employee_id");



CREATE INDEX "employee_ratings_employee_idx" ON "public"."employee_ratings" USING "btree" ("employee_id");



CREATE INDEX "employee_ratings_rater_idx" ON "public"."employee_ratings" USING "btree" ("rater_id");



CREATE INDEX "employee_year_votes_employee_idx" ON "public"."employee_year_votes" USING "btree" ("employee_id");



CREATE INDEX "employees_email_idx" ON "public"."employees" USING "btree" ("email");



CREATE UNIQUE INDEX "employees_employee_id_uidx" ON "public"."employees" USING "btree" ("employee_id");



CREATE INDEX "employees_tenant_company_idx" ON "public"."employees" USING "btree" ("company_id");



CREATE INDEX "expenses_tenant_company_idx" ON "public"."expenses" USING "btree" ("company_id");



CREATE INDEX "fleet_maintenance_tenant_company_idx" ON "public"."fleet_maintenance" USING "btree" ("company_id");



CREATE INDEX "fleet_vehicles_tenant_company_idx" ON "public"."fleet_vehicles" USING "btree" ("company_id");



CREATE INDEX "hr_documents_employee_idx" ON "public"."hr_documents" USING "btree" ("employee_id");



CREATE INDEX "idx_sheet_cells_company_id" ON "public"."sheet_cells" USING "btree" ("company_id");



CREATE INDEX "inventory_items_tenant_company_idx" ON "public"."inventory_items" USING "btree" ("company_id");



CREATE INDEX "invoice_items_tenant_company_idx" ON "public"."invoice_items" USING "btree" ("company_id");



CREATE INDEX "invoices_tenant_company_idx" ON "public"."invoices" USING "btree" ("company_id");



CREATE INDEX "jaad_applicants_company_id_idx" ON "public"."applicants" USING "btree" ("company_id");



CREATE INDEX "jaad_applicants_company_posting_idx" ON "public"."applicants" USING "btree" ("company_id", "posting_id");



CREATE INDEX "jaad_career_postings_company_id_idx" ON "public"."career_postings" USING "btree" ("company_id");



CREATE INDEX "lead_notes_tenant_company_idx" ON "public"."lead_notes" USING "btree" ("company_id");



CREATE UNIQUE INDEX "leads_registration_user_id_unique" ON "public"."leads" USING "btree" ("registration_user_id") WHERE ("registration_user_id" IS NOT NULL);



CREATE INDEX "leads_tenant_company_idx" ON "public"."leads" USING "btree" ("company_id");



CREATE INDEX "leave_requests_employee_id_idx" ON "public"."leave_requests" USING "btree" ("employee_id");



CREATE INDEX "leave_requests_employee_name_idx" ON "public"."leave_requests" USING "btree" ("employee_name");



CREATE INDEX "leave_requests_status_idx" ON "public"."leave_requests" USING "btree" ("status");



CREATE INDEX "leave_requests_tenant_company_idx" ON "public"."leave_requests" USING "btree" ("company_id");



CREATE INDEX "live_chat_messages_tenant_company_idx" ON "public"."live_chat_messages" USING "btree" ("company_id");



CREATE INDEX "live_chats_tenant_company_idx" ON "public"."live_chats" USING "btree" ("company_id");



CREATE INDEX "manifests_tenant_company_idx" ON "public"."manifests" USING "btree" ("company_id");



CREATE INDEX "proof_of_delivery_tenant_company_idx" ON "public"."proof_of_delivery" USING "btree" ("company_id");



CREATE INDEX "purchase_orders_tenant_company_idx" ON "public"."purchase_orders" USING "btree" ("company_id");



CREATE INDEX "quotations_tenant_company_idx" ON "public"."quotations" USING "btree" ("company_id");



CREATE INDEX "returns_tenant_company_idx" ON "public"."returns" USING "btree" ("company_id");



CREATE INDEX "support_calls_tenant_company_idx" ON "public"."support_calls" USING "btree" ("company_id");



CREATE INDEX "support_calls_twilio_call_sid_idx" ON "public"."support_calls" USING "btree" ("twilio_call_sid") WHERE ("twilio_call_sid" IS NOT NULL);



CREATE UNIQUE INDEX "support_calls_twilio_call_sid_unique" ON "public"."support_calls" USING "btree" ("twilio_call_sid") WHERE ("twilio_call_sid" IS NOT NULL);



CREATE INDEX "support_emails_customer_user_id_idx" ON "public"."support_emails" USING "btree" ("customer_user_id");



CREATE INDEX "support_emails_direction_created_at_idx" ON "public"."support_emails" USING "btree" ("direction", "created_at" DESC);



CREATE UNIQUE INDEX "support_emails_gmail_account_message_uidx" ON "public"."support_emails" USING "btree" ("gmail_account", "gmail_message_id") WHERE (("gmail_account" IS NOT NULL) AND ("gmail_message_id" IS NOT NULL));



CREATE UNIQUE INDEX "support_emails_provider_email_id_uidx" ON "public"."support_emails" USING "btree" ("provider_email_id") WHERE ("provider_email_id" IS NOT NULL);



CREATE INDEX "support_emails_status_scheduled_at_idx" ON "public"."support_emails" USING "btree" ("status", "scheduled_at") WHERE ("status" = 'Scheduled'::"text");



CREATE INDEX "support_emails_tenant_company_idx" ON "public"."support_emails" USING "btree" ("company_id");



CREATE UNIQUE INDEX "support_sms_provider_sid_uidx" ON "public"."support_sms" USING "btree" ("provider_sid") WHERE ("provider_sid" IS NOT NULL);



CREATE UNIQUE INDEX "support_sms_provider_sid_unique" ON "public"."support_sms" USING "btree" ("provider_sid") WHERE ("provider_sid" IS NOT NULL);



CREATE INDEX "support_sms_tenant_company_idx" ON "public"."support_sms" USING "btree" ("company_id");



CREATE INDEX "support_whatsapp_tenant_company_idx" ON "public"."support_whatsapp" USING "btree" ("company_id");



CREATE INDEX "team_chat_messages_created_at_idx" ON "public"."team_chat_messages" USING "btree" ("created_at");



CREATE INDEX "team_chat_messages_direct_thread_idx" ON "public"."team_chat_messages" USING "btree" ("sender_name", "recipient_name", "created_at");



CREATE INDEX "team_chat_messages_recipient_read_idx" ON "public"."team_chat_messages" USING "btree" ("recipient_name", "read_at");



CREATE INDEX "team_chat_messages_tenant_company_idx" ON "public"."team_chat_messages" USING "btree" ("company_id");



CREATE INDEX "tickets_tenant_company_idx" ON "public"."tickets" USING "btree" ("company_id");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");



CREATE UNIQUE INDEX "idx_objects_current_version" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_objects_delete_markers" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C") WHERE "is_delete_marker";



CREATE UNIQUE INDEX "idx_objects_null_version" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C") WHERE (NOT "is_versioned");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_name_version_key" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C", "version") NULLS NOT DISTINCT;



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "bookings_set_tracking_no" BEFORE INSERT ON "public"."bookings" FOR EACH ROW WHEN ((("new"."tracking_no" IS NULL) OR ("new"."tracking_no" = ''::"text"))) EXECUTE FUNCTION "public"."trg_set_tracking_no"();



CREATE OR REPLACE TRIGGER "jaad_initialize_company_subscription_trigger" AFTER INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_initialize_company_subscription"();



CREATE OR REPLACE TRIGGER "jaad_protect_profile_identity_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_protect_profile_identity"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."booking_cargo_items" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."chat_threads" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."clock_entries" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."crm_sheet_cells" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."crm_sheet_tabs" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."fleet_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."fleet_vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."lead_notes" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."live_chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."live_chats" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."manifests" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."proof_of_delivery" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."returns" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."support_calls" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."support_emails" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."support_sms" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."support_whatsapp" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."team_chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "jaad_tenant_assign_on_write" BEFORE INSERT OR UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_assign_company_on_write"();



CREATE OR REPLACE TRIGGER "trg_jaad_validate_live_chat_company" BEFORE INSERT OR UPDATE OF "chat_id", "company_id" ON "public"."live_chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."jaad_validate_live_chat_company"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "protect_bucket_control_insert" BEFORE INSERT ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."protect_bucket_control_columns"('service_role');



CREATE OR REPLACE TRIGGER "protect_bucket_control_update" BEFORE UPDATE OF "lifecycle_configuration", "lifecycle_configuration_generation" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."protect_bucket_control_columns"();



CREATE OR REPLACE TRIGGER "protect_bucket_control_update_role" AFTER UPDATE OF "lifecycle_configuration", "lifecycle_configuration_generation" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_lifecycle_service_role"('service_role');



CREATE OR REPLACE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_conversations"
    ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_payment_attempts"
    ADD CONSTRAINT "billing_payment_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_payment_attempts"
    ADD CONSTRAINT "billing_payment_attempts_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."booking_cargo_items"
    ADD CONSTRAINT "booking_cargo_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_threads"
    ADD CONSTRAINT "chat_threads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."clock_entries"
    ADD CONSTRAINT "clock_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."company_subscriptions"
    ADD CONSTRAINT "company_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_workspace_settings"
    ADD CONSTRAINT "company_workspace_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_sheet_cells"
    ADD CONSTRAINT "crm_sheet_cells_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "public"."crm_sheet_tabs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_erp_leads"
    ADD CONSTRAINT "customer_erp_leads_tenant_customer_id_fkey" FOREIGN KEY ("tenant_customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_inventory"
    ADD CONSTRAINT "customer_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_lead_notes"
    ADD CONSTRAINT "customer_lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."customer_leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_leads"
    ADD CONSTRAINT "customer_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_notes"
    ADD CONSTRAINT "customer_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_own_invoice_items"
    ADD CONSTRAINT "customer_own_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."customer_own_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_own_invoices"
    ADD CONSTRAINT "customer_own_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_team_members"
    ADD CONSTRAINT "customer_team_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_team_members"
    ADD CONSTRAINT "customer_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."driver_onboarding_links"
    ADD CONSTRAINT "driver_onboarding_links_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_letters"
    ADD CONSTRAINT "employee_letters_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_ratings"
    ADD CONSTRAINT "employee_ratings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_ratings"
    ADD CONSTRAINT "employee_ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_year_votes"
    ADD CONSTRAINT "employee_year_votes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_insurance"
    ADD CONSTRAINT "fleet_insurance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_maintenance"
    ADD CONSTRAINT "fleet_maintenance_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."fleet_maintenance"
    ADD CONSTRAINT "fleet_maintenance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_vehicles"
    ADD CONSTRAINT "fleet_vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gmail_connections"
    ADD CONSTRAINT "gmail_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_calendar_tokens"
    ADD CONSTRAINT "google_calendar_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_documents"
    ADD CONSTRAINT "hr_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_branding"
    ADD CONSTRAINT "invoice_branding_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_linked_booking_id_fkey" FOREIGN KEY ("linked_booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jaad_platform_config"
    ADD CONSTRAINT "jaad_platform_config_crm_company_id_fkey" FOREIGN KEY ("crm_company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."lead_notes"
    ADD CONSTRAINT "lead_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_notes"
    ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_linked_customer_id_fkey" FOREIGN KEY ("linked_customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."live_chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chats"
    ADD CONSTRAINT "live_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."manifest_bookings"
    ADD CONSTRAINT "manifest_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifest_bookings"
    ADD CONSTRAINT "manifest_bookings_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "public"."manifests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifest_shipments"
    ADD CONSTRAINT "manifest_shipments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifest_shipments"
    ADD CONSTRAINT "manifest_shipments_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "public"."manifests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manifests"
    ADD CONSTRAINT "manifests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."manifests"
    ADD CONSTRAINT "manifests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."proof_of_delivery"
    ADD CONSTRAINT "proof_of_delivery_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proof_of_delivery"
    ADD CONSTRAINT "proof_of_delivery_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sheet_cells"
    ADD CONSTRAINT "sheet_cells_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."support_emails"
    ADD CONSTRAINT "support_emails_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_inbound_addresses"
    ADD CONSTRAINT "support_inbound_addresses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracking_events"
    ADD CONSTRAINT "tracking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



CREATE POLICY "Admins can read all entries" ON "public"."clock_entries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read knowledge base" ON "public"."kb_articles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Customers access their own booking cargo items" ON "public"."booking_cargo_items" USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "booking_cargo_items"."booking_id") AND ("bookings"."user_id" = "public"."effective_customer_user_id"()) AND ("public"."customer_has_module"('shipments'::"text") OR "public"."customer_has_module"('track'::"text") OR "public"."customer_has_module"('overview'::"text")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "booking_cargo_items"."booking_id") AND ("bookings"."user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('shipments'::"text")))));



CREATE POLICY "Customers can create their own bookings" ON "public"."bookings" FOR INSERT WITH CHECK ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('shipments'::"text")));



CREATE POLICY "Customers can create their own live chat" ON "public"."live_chats" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers can insert their own emails" ON "public"."support_emails" FOR INSERT TO "authenticated" WITH CHECK ((("customer_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."roles" ON (("roles"."id" = "profiles"."role_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['Super Admin'::"text", 'Customer Service'::"text"])))))));



CREATE POLICY "Customers can send messages in their own chat" ON "public"."live_chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."live_chats"
  WHERE (("live_chats"."id" = "live_chat_messages"."chat_id") AND ("live_chats"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view and update their own row" ON "public"."customers" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers can view invoices for their own bookings" ON "public"."invoices" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "invoices"."linked_booking_id") AND ("bookings"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view items on their own invoices" ON "public"."invoice_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."invoices"
     JOIN "public"."bookings" ON (("bookings"."id" = "invoices"."linked_booking_id")))
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("bookings"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view messages in their own chat" ON "public"."live_chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."live_chats"
  WHERE (("live_chats"."id" = "live_chat_messages"."chat_id") AND ("live_chats"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers can view their own bookings" ON "public"."bookings" FOR SELECT USING ((("user_id" = "public"."effective_customer_user_id"()) AND ("public"."customer_has_module"('shipments'::"text") OR "public"."customer_has_module"('track'::"text") OR "public"."customer_has_module"('overview'::"text"))));



CREATE POLICY "Customers can view their own emails" ON "public"."support_emails" FOR SELECT TO "authenticated" USING ((("customer_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."roles" ON (("roles"."id" = "profiles"."role_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['Super Admin'::"text", 'Customer Service'::"text"])))))));



CREATE POLICY "Customers can view their own live chat" ON "public"."live_chats" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers manage items on their own invoices" ON "public"."customer_own_invoice_items" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_own_invoices"
  WHERE (("customer_own_invoices"."id" = "customer_own_invoice_items"."invoice_id") AND ("customer_own_invoices"."user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('invoices'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customer_own_invoices"
  WHERE (("customer_own_invoices"."id" = "customer_own_invoice_items"."invoice_id") AND ("customer_own_invoices"."user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('invoices'::"text")))));



CREATE POLICY "Customers manage notes on their own leads" ON "public"."customer_lead_notes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customer_leads"
  WHERE (("customer_leads"."id" = "customer_lead_notes"."lead_id") AND ("customer_leads"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customer_leads"
  WHERE (("customer_leads"."id" = "customer_lead_notes"."lead_id") AND ("customer_leads"."user_id" = "auth"."uid"())))));



CREATE POLICY "Customers manage their own inventory" ON "public"."customer_inventory" USING ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('inventory'::"text"))) WITH CHECK ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('inventory'::"text")));



CREATE POLICY "Customers manage their own leads" ON "public"."customer_leads" USING ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('leads'::"text"))) WITH CHECK ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('leads'::"text")));



CREATE POLICY "Customers manage their own notes" ON "public"."customer_notes" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers manage their own personal invoices" ON "public"."customer_own_invoices" USING ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('invoices'::"text"))) WITH CHECK ((("user_id" = "public"."effective_customer_user_id"()) AND "public"."customer_has_module"('invoices'::"text")));



CREATE POLICY "JAAD Super Admins can read audit log" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."jaad_current_user_is_super_admin"());



CREATE POLICY "JAAD active users can read visible announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING (("public"."jaad_current_user_is_active"() AND ("publish_at" <= "now"()) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Owner manages own team" ON "public"."customer_team_members" USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"())))) WITH CHECK (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Public can view tracking" ON "public"."tracking_events" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Staff can delete tracking" ON "public"."tracking_events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Staff can manage tracking" ON "public"."tracking_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Staff can update support emails" ON "public"."support_emails" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."roles" ON (("roles"."id" = "profiles"."role_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['Super Admin'::"text", 'Customer Service'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."roles" ON (("roles"."id" = "profiles"."role_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("roles"."name" = ANY (ARRAY['Super Admin'::"text", 'Customer Service'::"text"]))))));



CREATE POLICY "Staff can update tracking" ON "public"."tracking_events" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Staff can view their owning business row" ON "public"."customers" FOR SELECT USING (("id" = "public"."customer_id_for_active_staff"("auth"."uid"())));



CREATE POLICY "Team member sees own row" ON "public"."customer_team_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users access messages in their own conversations" ON "public"."ai_messages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations" "c"
  WHERE (("c"."id" = "ai_messages"."conversation_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_conversations" "c"
  WHERE (("c"."id" = "ai_messages"."conversation_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their own Google Calendar token row" ON "public"."google_calendar_tokens" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own Google Calendar token row" ON "public"."google_calendar_tokens" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own entries" ON "public"."clock_entries" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own Google Calendar token row" ON "public"."google_calendar_tokens" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own Google Calendar token row" ON "public"."google_calendar_tokens" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own AI conversations" ON "public"."ai_conversations" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."ai_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applicants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_admin" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."auth_has_module"('admin'::"text"));



ALTER TABLE "public"."billing_payment_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_payment_attempts_select_owner" ON "public"."billing_payment_attempts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "billing_payment_attempts"."company_id") AND ("c"."owner_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."booking_cargo_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_by_module" ON "public"."bookings" TO "authenticated" USING ("public"."auth_has_module"('shipments'::"text")) WITH CHECK ("public"."auth_has_module"('shipments'::"text"));



ALTER TABLE "public"."career_postings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_by_module" ON "public"."chat_messages" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."chat_threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_threads_by_module" ON "public"."chat_threads" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."clock_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies_select_members" ON "public"."companies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."company_id" = "companies"."id")))));



CREATE POLICY "company_settings_insert_owner" ON "public"."company_workspace_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "company_workspace_settings"."company_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "company_settings_read_member" ON "public"."company_workspace_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."company_id" = "company_workspace_settings"."company_id")))));



CREATE POLICY "company_settings_update_owner" ON "public"."company_workspace_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "company_workspace_settings"."company_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE (("c"."id" = "company_workspace_settings"."company_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."company_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_subscriptions_select_members" ON "public"."company_subscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."company_id" = "company_subscriptions"."company_id")))));



ALTER TABLE "public"."company_workspace_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_sheet_cells" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_sheet_cells_module_access" ON "public"."crm_sheet_cells" TO "authenticated" USING ("public"."auth_has_module"('crm'::"text")) WITH CHECK ("public"."auth_has_module"('crm'::"text"));



ALTER TABLE "public"."crm_sheet_tabs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_sheet_tabs_module_access" ON "public"."crm_sheet_tabs" TO "authenticated" USING ("public"."auth_has_module"('crm'::"text")) WITH CHECK ("public"."auth_has_module"('crm'::"text"));



ALTER TABLE "public"."customer_erp_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_erp_leads_delete" ON "public"."customer_erp_leads" FOR DELETE TO "authenticated" USING (("tenant_customer_id" IN ( SELECT "public"."jaad_my_customer_tenants"() AS "jaad_my_customer_tenants")));



CREATE POLICY "customer_erp_leads_insert" ON "public"."customer_erp_leads" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_customer_id" IN ( SELECT "public"."jaad_my_customer_tenants"() AS "jaad_my_customer_tenants")) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "customer_erp_leads_select" ON "public"."customer_erp_leads" FOR SELECT TO "authenticated" USING (("tenant_customer_id" IN ( SELECT "public"."jaad_my_customer_tenants"() AS "jaad_my_customer_tenants")));



CREATE POLICY "customer_erp_leads_update" ON "public"."customer_erp_leads" FOR UPDATE TO "authenticated" USING (("tenant_customer_id" IN ( SELECT "public"."jaad_my_customer_tenants"() AS "jaad_my_customer_tenants"))) WITH CHECK (("tenant_customer_id" IN ( SELECT "public"."jaad_my_customer_tenants"() AS "jaad_my_customer_tenants")));



ALTER TABLE "public"."customer_inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_lead_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_own_invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_own_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_by_module" ON "public"."customers" TO "authenticated" USING ("public"."auth_has_module"('customers'::"text")) WITH CHECK ("public"."auth_has_module"('customers'::"text"));



CREATE POLICY "customers_self_insert" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "customers_self_select" ON "public"."customers" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "customers_self_update" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."driver_onboarding_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "drivers_by_module" ON "public"."drivers" TO "authenticated" USING ("public"."auth_has_module"('drivers'::"text")) WITH CHECK ("public"."auth_has_module"('drivers'::"text"));



ALTER TABLE "public"."employee_letters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_letters_hr_access" ON "public"."employee_letters" TO "authenticated" USING ("public"."auth_has_module"('hr'::"text")) WITH CHECK ("public"."auth_has_module"('hr'::"text"));



ALTER TABLE "public"."employee_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_ratings_hr_read" ON "public"."employee_ratings" FOR SELECT TO "authenticated" USING ("public"."auth_has_module"('hr'::"text"));



ALTER TABLE "public"."employee_year_votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_year_votes_public_insert" ON "public"."employee_year_votes" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("appearance" >= 1) AND ("appearance" <= 5)) AND (("behavior" >= 1) AND ("behavior" <= 5)) AND (("communication" >= 1) AND ("communication" <= 5)) AND (("teamwork" >= 1) AND ("teamwork" <= 5)) AND (("reliability" >= 1) AND ("reliability" <= 5)) AND (("leadership" >= 1) AND ("leadership" <= 5))));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_by_module" ON "public"."employees" TO "authenticated" USING ("public"."auth_has_module"('hr'::"text")) WITH CHECK ("public"."auth_has_module"('hr'::"text"));



ALTER TABLE "public"."expense_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expense_items_by_module" ON "public"."expense_items" TO "authenticated" USING ("public"."auth_has_module"('finance'::"text")) WITH CHECK ("public"."auth_has_module"('finance'::"text"));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_by_module" ON "public"."expenses" TO "authenticated" USING ("public"."auth_has_module"('finance'::"text")) WITH CHECK ("public"."auth_has_module"('finance'::"text"));



CREATE POLICY "fleet_by_module" ON "public"."fleet_vehicles" TO "authenticated" USING ("public"."auth_has_module"('fleet'::"text")) WITH CHECK ("public"."auth_has_module"('fleet'::"text"));



ALTER TABLE "public"."fleet_insurance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fleet_insurance_by_module" ON "public"."fleet_insurance" TO "authenticated" USING (("public"."auth_has_module"('fleet'::"text") OR "public"."auth_has_module"('admin'::"text"))) WITH CHECK (("public"."auth_has_module"('fleet'::"text") OR "public"."auth_has_module"('admin'::"text")));



ALTER TABLE "public"."fleet_maintenance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fleet_maintenance_by_module" ON "public"."fleet_maintenance" TO "authenticated" USING (("public"."auth_has_module"('fleet'::"text") OR "public"."auth_has_module"('admin'::"text"))) WITH CHECK (("public"."auth_has_module"('fleet'::"text") OR "public"."auth_has_module"('admin'::"text")));



ALTER TABLE "public"."fleet_vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fleet_vehicles_by_module" ON "public"."fleet_vehicles" TO "authenticated" USING (("public"."auth_has_module"('fleet'::"text") OR "public"."auth_has_module"('admin'::"text"))) WITH CHECK (("public"."auth_has_module"('fleet'::"text") OR "public"."auth_has_module"('admin'::"text")));



ALTER TABLE "public"."gmail_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_calendar_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_documents_hr_access" ON "public"."hr_documents" TO "authenticated" USING ("public"."auth_has_module"('hr'::"text")) WITH CHECK ("public"."auth_has_module"('hr'::"text"));



CREATE POLICY "inventory_by_module" ON "public"."inventory_items" USING ("public"."auth_has_module"('warehouse'::"text")) WITH CHECK ("public"."auth_has_module"('warehouse'::"text"));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_branding" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_branding_insert" ON "public"."invoice_branding" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('finance'::"text")));



CREATE POLICY "invoice_branding_select" ON "public"."invoice_branding" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('finance'::"text")));



CREATE POLICY "invoice_branding_update" ON "public"."invoice_branding" FOR UPDATE TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('finance'::"text"))) WITH CHECK ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('finance'::"text")));



ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_items_by_module" ON "public"."invoice_items" TO "authenticated" USING ("public"."auth_has_module"('finance'::"text")) WITH CHECK ("public"."auth_has_module"('finance'::"text"));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_by_module" ON "public"."invoices" TO "authenticated" USING (("public"."auth_has_module"('finance'::"text") OR "public"."auth_has_module"('admin'::"text"))) WITH CHECK (("public"."auth_has_module"('finance'::"text") OR "public"."auth_has_module"('admin'::"text")));



CREATE POLICY "jaad_applicants_tenant_delete" ON "public"."applicants" FOR DELETE TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_applicants_tenant_read" ON "public"."applicants" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_applicants_tenant_update" ON "public"."applicants" FOR UPDATE TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text"))) WITH CHECK ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_career_public_read" ON "public"."career_postings" FOR SELECT TO "authenticated", "anon" USING (("company_id" IS NOT NULL));



CREATE POLICY "jaad_career_tenant_delete" ON "public"."career_postings" FOR DELETE TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_career_tenant_insert" ON "public"."career_postings" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_career_tenant_update" ON "public"."career_postings" FOR UPDATE TO "authenticated" USING ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text"))) WITH CHECK ((("company_id" = "public"."jaad_current_company_id"()) AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_chat_message_thread_guard" ON "public"."chat_messages" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_threads" "t"
  WHERE (("t"."id" = "chat_messages"."thread_id") AND ("t"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_threads" "t"
  WHERE (("t"."id" = "chat_messages"."thread_id") AND ("t"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."booking_cargo_items" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."bookings" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."chat_messages" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."chat_threads" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."clock_entries" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."crm_sheet_cells" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."crm_sheet_tabs" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."customers" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."drivers" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."employees" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."expenses" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."fleet_maintenance" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."fleet_vehicles" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."inventory_items" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."invoice_items" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."invoices" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."lead_notes" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."leads" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."leave_requests" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."live_chat_messages" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."live_chats" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."manifests" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."notifications" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."proof_of_delivery" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."purchase_orders" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."quotations" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."returns" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."support_calls" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."support_emails" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."support_sms" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."support_whatsapp" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."team_chat_messages" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_isolation_guard" ON "public"."tickets" AS RESTRICTIVE TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



CREATE POLICY "jaad_company_parent_guard" ON "public"."customer_erp_leads" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "p"
  WHERE (("p"."id" = "customer_erp_leads"."tenant_customer_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "p"
  WHERE (("p"."id" = "customer_erp_leads"."tenant_customer_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."customer_lead_notes" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."customer_leads" "p"
     JOIN "public"."profiles" "u" ON (("u"."id" = "p"."user_id")))
  WHERE (("p"."id" = "customer_lead_notes"."lead_id") AND ("u"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."customer_leads" "p"
     JOIN "public"."profiles" "u" ON (("u"."id" = "p"."user_id")))
  WHERE (("p"."id" = "customer_lead_notes"."lead_id") AND ("u"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."customer_own_invoice_items" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."customer_own_invoices" "p"
     JOIN "public"."profiles" "u" ON (("u"."id" = "p"."user_id")))
  WHERE (("p"."id" = "customer_own_invoice_items"."invoice_id") AND ("u"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."customer_own_invoices" "p"
     JOIN "public"."profiles" "u" ON (("u"."id" = "p"."user_id")))
  WHERE (("p"."id" = "customer_own_invoice_items"."invoice_id") AND ("u"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."employee_letters" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "p"
  WHERE (("p"."id" = "employee_letters"."employee_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employees" "p"
  WHERE (("p"."id" = "employee_letters"."employee_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."employee_ratings" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "p"
  WHERE (("p"."id" = "employee_ratings"."employee_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employees" "p"
  WHERE (("p"."id" = "employee_ratings"."employee_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."expense_items" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."expenses" "p"
  WHERE (("p"."id" = "expense_items"."expense_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."expenses" "p"
  WHERE (("p"."id" = "expense_items"."expense_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."fleet_insurance" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."fleet_vehicles" "p"
  WHERE (("p"."id" = "fleet_insurance"."vehicle_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."fleet_vehicles" "p"
  WHERE (("p"."id" = "fleet_insurance"."vehicle_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."hr_documents" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "p"
  WHERE (("p"."id" = "hr_documents"."employee_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employees" "p"
  WHERE (("p"."id" = "hr_documents"."employee_id") AND ("p"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."manifest_bookings" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."manifests" "m"
     JOIN "public"."bookings" "b" ON (("b"."id" = "manifest_bookings"."booking_id")))
  WHERE (("m"."id" = "manifest_bookings"."manifest_id") AND ("m"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")) AND ("b"."company_id" = "m"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."manifests" "m"
     JOIN "public"."bookings" "b" ON (("b"."id" = "manifest_bookings"."booking_id")))
  WHERE (("m"."id" = "manifest_bookings"."manifest_id") AND ("m"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")) AND ("b"."company_id" = "m"."company_id")))));



CREATE POLICY "jaad_company_parent_guard" ON "public"."manifest_shipments" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."manifests" "m"
     JOIN "public"."bookings" "b" ON (("b"."id" = "manifest_shipments"."booking_id")))
  WHERE (("m"."id" = "manifest_shipments"."manifest_id") AND ("m"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")) AND ("b"."company_id" = "m"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."manifests" "m"
     JOIN "public"."bookings" "b" ON (("b"."id" = "manifest_shipments"."booking_id")))
  WHERE (("m"."id" = "manifest_shipments"."manifest_id") AND ("m"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")) AND ("b"."company_id" = "m"."company_id")))));



CREATE POLICY "jaad_live_chat_messages_support_access" ON "public"."live_chat_messages" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



CREATE POLICY "jaad_live_chats_support_access" ON "public"."live_chats" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."jaad_platform_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jaad_profiles_company_guard" ON "public"."profiles" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR (("company_id" IS NOT NULL) AND ("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))));



CREATE POLICY "jaad_team_chat_module_access" ON "public"."team_chat_messages" TO "authenticated" USING ("public"."auth_has_module"('team_chat'::"text")) WITH CHECK ("public"."auth_has_module"('team_chat'::"text"));



CREATE POLICY "jaad_tracking_company_guard" ON "public"."tracking_events" AS RESTRICTIVE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "tracking_events"."booking_id") AND ("b"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "tracking_events"."booking_id") AND ("b"."company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))))));



ALTER TABLE "public"."kb_articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kb_support_delete" ON "public"."kb_articles" FOR DELETE TO "authenticated" USING ("public"."auth_has_module"('support'::"text"));



CREATE POLICY "kb_support_insert" ON "public"."kb_articles" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_has_module"('support'::"text"));



CREATE POLICY "kb_support_update" ON "public"."kb_articles" FOR UPDATE TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."lead_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_notes_by_module" ON "public"."lead_notes" TO "authenticated" USING ("public"."auth_has_module"('crm'::"text")) WITH CHECK ("public"."auth_has_module"('crm'::"text"));



ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leads_by_module" ON "public"."leads" TO "authenticated" USING ("public"."auth_has_module"('crm'::"text")) WITH CHECK ("public"."auth_has_module"('crm'::"text"));



CREATE POLICY "leave_by_module" ON "public"."leave_requests" USING ("public"."auth_has_module"('hr'::"text")) WITH CHECK ("public"."auth_has_module"('hr'::"text"));



ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manifest_bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manifest_bookings_shipments_access" ON "public"."manifest_bookings" TO "authenticated" USING ("public"."auth_has_module"('shipments'::"text")) WITH CHECK ("public"."auth_has_module"('shipments'::"text"));



ALTER TABLE "public"."manifest_shipments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manifest_shipments_by_module" ON "public"."manifest_shipments" TO "authenticated" USING ("public"."auth_has_module"('shipments'::"text")) WITH CHECK ("public"."auth_has_module"('shipments'::"text"));



ALTER TABLE "public"."manifests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manifests_by_module" ON "public"."manifests" TO "authenticated" USING ("public"."auth_has_module"('shipments'::"text")) WITH CHECK ("public"."auth_has_module"('shipments'::"text"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_mark_read" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "notifications_read_all" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "po_by_module" ON "public"."purchase_orders" TO "authenticated" USING ("public"."auth_has_module"('warehouse'::"text")) WITH CHECK ("public"."auth_has_module"('warehouse'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_read_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."auth_has_module"('admin'::"text"));



CREATE POLICY "profiles_admin_write" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."auth_has_module"('admin'::"text"));



CREATE POLICY "profiles_self_insert_denied" ON "public"."profiles" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "profiles_self_read" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."proof_of_delivery" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proof_of_delivery_shipments_access" ON "public"."proof_of_delivery" TO "authenticated" USING ("public"."auth_has_module"('shipments'::"text")) WITH CHECK ("public"."auth_has_module"('shipments'::"text"));



ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotation_items_tenant_access" ON "public"."quotation_items" TO "authenticated" USING (("public"."auth_has_module"('crm'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."quotations" "q"
  WHERE (("q"."id" = "quotation_items"."quotation_id") AND ("q"."company_id" = "public"."jaad_current_company_id"())))))) WITH CHECK (("public"."auth_has_module"('crm'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."quotations" "q"
  WHERE (("q"."id" = "quotation_items"."quotation_id") AND ("q"."company_id" = "public"."jaad_current_company_id"()))))));



ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotations_by_module" ON "public"."quotations" TO "authenticated" USING ("public"."auth_has_module"('crm'::"text")) WITH CHECK ("public"."auth_has_module"('crm'::"text"));



ALTER TABLE "public"."returns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "returns_by_module" ON "public"."returns" TO "authenticated" USING ("public"."auth_has_module"('shipments'::"text")) WITH CHECK ("public"."auth_has_module"('shipments'::"text"));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_admin_delete" ON "public"."roles" FOR DELETE TO "authenticated" USING ("public"."auth_has_module"('admin'::"text"));



CREATE POLICY "roles_admin_update" ON "public"."roles" FOR UPDATE TO "authenticated" USING ("public"."auth_has_module"('admin'::"text"));



CREATE POLICY "roles_admin_write" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_has_module"('admin'::"text"));



CREATE POLICY "roles_read_all" ON "public"."roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."sheet_cells" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sheet_cells_tenant_access" ON "public"."sheet_cells" TO "authenticated" USING (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))) WITH CHECK (("company_id" = ( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id")));



ALTER TABLE "public"."support_calls" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_calls_module_access" ON "public"."support_calls" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."support_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_inbound_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_sms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_sms_module_access" ON "public"."support_sms" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."support_whatsapp" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_whatsapp_module_access" ON "public"."support_whatsapp" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."team_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_by_module" ON "public"."tickets" TO "authenticated" USING ("public"."auth_has_module"('support'::"text")) WITH CHECK ("public"."auth_has_module"('support'::"text"));



ALTER TABLE "public"."tracking_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "warehouse_inventory_access" ON "public"."inventory_items" TO "authenticated" USING (("public"."auth_has_module"('warehouse'::"text") OR "public"."auth_has_module"('admin'::"text"))) WITH CHECK (("public"."auth_has_module"('warehouse'::"text") OR "public"."auth_has_module"('admin'::"text")));



CREATE POLICY "Tenant logos are publicly readable" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'logos'::"text"));



CREATE POLICY "Tenant owners delete their own logo" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Tenant owners update their own logo" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = "auth"."uid"())))))) WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Tenant owners upload their own logo" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own avatar" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can upload own avatar" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jaad_chat_live_company_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."live_chats" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("objects"."name"))[2]) AND ("c"."company_id" = "public"."jaad_current_company_id"())))) AND "public"."auth_has_module"('support'::"text")));



CREATE POLICY "jaad_chat_live_company_select" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'chat-attachments'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND (EXISTS ( SELECT 1
   FROM "public"."live_chats" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("objects"."name"))[2]) AND ("c"."company_id" = "public"."jaad_current_company_id"())))) AND "public"."auth_has_module"('support'::"text")));



CREATE POLICY "jaad_company_member_logo_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("lower"(COALESCE("p"."status", 'active'::"text")) = 'active'::"text") AND (("p"."company_id")::"text" = ("storage"."foldername"("objects"."name"))[1]))))));



CREATE POLICY "jaad_company_member_logo_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("lower"(COALESCE("p"."status", 'active'::"text")) = 'active'::"text") AND (("p"."company_id")::"text" = ("storage"."foldername"("objects"."name"))[1])))))) WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("lower"(COALESCE("p"."status", 'active'::"text")) = 'active'::"text") AND (("p"."company_id")::"text" = ("storage"."foldername"("objects"."name"))[1]))))));



CREATE POLICY "jaad_company_owner_logo_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "jaad_company_owner_logo_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."companies" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "jaad_customer_upload_own_avatars" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "jaad_cv_public_insert" ON "storage"."objects" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("bucket_id" = 'applicant-cvs'::"text") AND (("storage"."foldername"("name"))[1] = 'incoming'::"text") AND (("storage"."foldername"("name"))[2] ~ '^[0-9a-f-]{36}$'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."career_postings"
  WHERE (("career_postings"."id" = (("storage"."foldername"("objects"."name"))[2])::"uuid") AND ("career_postings"."company_id" IS NOT NULL)))) AND ("name" ~ '^incoming/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|doc|docx)$'::"text")));



CREATE POLICY "jaad_cv_tenant_read" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'applicant-cvs'::"text") AND "public"."auth_has_module"('hr'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."applicants" "a"
  WHERE (("a"."company_id" = "public"."jaad_current_company_id"()) AND ("a"."cv_url" = "a"."name"))))));



CREATE POLICY "jaad_driver_tenant_delete" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'driver-documents'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text")));



CREATE POLICY "jaad_driver_tenant_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'driver-documents'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text")));



CREATE POLICY "jaad_driver_tenant_select" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'driver-documents'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text")));



CREATE POLICY "jaad_driver_tenant_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'driver-documents'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text"))) WITH CHECK ((("bucket_id" = 'driver-documents'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text")));



CREATE POLICY "jaad_employee_file_delete" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'employee-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_employee_file_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'employee-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_employee_file_read" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'employee-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_employee_file_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'employee-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND "public"."auth_has_module"('hr'::"text"))) WITH CHECK ((("bucket_id" = 'employee-documents'::"text") AND (("storage"."foldername"("name"))[1] = ("public"."jaad_current_company_id"())::"text") AND "public"."auth_has_module"('hr'::"text")));



CREATE POLICY "jaad_invoice_branding_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'jaad-invoice-logos'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text") AND "public"."auth_has_module"('finance'::"text")));



CREATE POLICY "jaad_invoice_branding_read" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'jaad-invoice-logos'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text") AND "public"."auth_has_module"('finance'::"text")));



CREATE POLICY "jaad_invoice_branding_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'jaad-invoice-logos'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text") AND "public"."auth_has_module"('finance'::"text"))) WITH CHECK ((("bucket_id" = 'jaad-invoice-logos'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "public"."jaad_current_company_id"() AS "jaad_current_company_id"))::"text") AND "public"."auth_has_module"('finance'::"text")));



CREATE POLICY "jaad_invoice_logos_owner_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'invoice-logos'::"text") AND (("storage"."foldername"("name"))[1] = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "jaad_logo_tenant_owner_delete" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "jaad_logo_tenant_owner_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("objects"."name"))[1]) AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "jaad_logo_tenant_owner_update" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("bucket_id" = 'logos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE ((("c"."id")::"text" = ("storage"."foldername"("c"."name"))[1]) AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



REVOKE ALL ON FUNCTION "public"."accept_staff_invite"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_staff_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_staff_invite"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_has_module"("module_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_has_module"("module_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_has_module"("module_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_permitted_modules"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_permitted_modules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_permitted_modules"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cast_employee_of_year_vote"("p_employee_id" "uuid", "p_appearance" integer, "p_behavior" integer, "p_communication" integer, "p_teamwork" integer, "p_reliability" integer, "p_leadership" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cast_employee_of_year_vote"("p_employee_id" "uuid", "p_appearance" integer, "p_behavior" integer, "p_communication" integer, "p_teamwork" integer, "p_reliability" integer, "p_leadership" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cast_employee_of_year_vote"("p_employee_id" "uuid", "p_appearance" integer, "p_behavior" integer, "p_communication" integer, "p_teamwork" integer, "p_reliability" integer, "p_leadership" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cast_employee_of_year_vote"("p_employee_id" "uuid", "p_appearance" integer, "p_behavior" integer, "p_communication" integer, "p_teamwork" integer, "p_reliability" integer, "p_leadership" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cast_employee_rating"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cast_employee_rating"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."cast_employee_rating"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cast_employee_rating"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cast_employee_rating_v2"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cast_employee_rating_v2"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."cast_employee_rating_v2"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cast_employee_rating_v2"("employee_uuid" "uuid", "rater_uuid" "uuid", "appearance_score" smallint, "behavior_score" smallint, "communication_score" smallint, "teamwork_score" smallint, "reliability_score" smallint, "leadership_score" smallint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_has_module"("module_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_has_module"("module_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_has_module"("module_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_id_for_active_staff"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_id_for_active_staff"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_id_for_active_staff"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_modules_for_role"("role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_modules_for_role"("role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_modules_for_role"("role_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_permitted_modules"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_permitted_modules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_permitted_modules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."effective_customer_owner_id"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."effective_customer_owner_id"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."effective_customer_owner_id"("uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."effective_customer_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."effective_customer_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."effective_customer_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tracking_no"("p_pickup" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tracking_no"("p_pickup" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tracking_no"("p_pickup" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_employee_profile"("employee_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_employee_profile"("employee_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_employee_profile"("employee_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_employee_profile"("employee_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_employee_profile_v2"("employee_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_employee_profile_v2"("employee_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_employee_profile_v2"("employee_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_employee_profile_v2"("employee_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_customer"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_employee_votes"("employee_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_employee_votes"("employee_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_employee_votes"("employee_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_activate_subscription_from_payment"("p_reference" "text", "p_paystack_transaction_id" "text", "p_paid_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_activate_subscription_from_payment"("p_reference" "text", "p_paystack_transaction_id" "text", "p_paid_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."jaad_assign_company_on_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."jaad_assign_company_on_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_assign_company_on_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_current_company_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_current_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_current_company_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_current_user_is_active"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_current_user_is_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_current_user_is_active"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_current_user_is_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_current_user_is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_current_user_is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jaad_initialize_company_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."jaad_initialize_company_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_initialize_company_subscription"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_my_customer_tenants"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_my_customer_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_my_customer_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jaad_protect_profile_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."jaad_protect_profile_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_protect_profile_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_register_business"("p_user_id" "uuid", "p_business_name" "text", "p_contact_name" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_register_business"("p_user_id" "uuid", "p_business_name" "text", "p_contact_name" "text", "p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."jaad_submit_career_application"("p_posting_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_location" "text", "p_cover_note" "text", "p_cv_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jaad_submit_career_application"("p_posting_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_location" "text", "p_cover_note" "text", "p_cv_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."jaad_submit_career_application"("p_posting_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_location" "text", "p_cover_note" "text", "p_cv_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_submit_career_application"("p_posting_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_location" "text", "p_cover_note" "text", "p_cv_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaad_validate_live_chat_company"() TO "anon";
GRANT ALL ON FUNCTION "public"."jaad_validate_live_chat_company"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaad_validate_live_chat_company"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_tracking_no"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_tracking_no"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_tracking_no"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."vote_employee"("employee_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."vote_employee"("employee_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vote_employee"("employee_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vote_employee"("employee_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."ai_conversations" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."ai_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_messages" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."announcements" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."applicants" TO "anon";
GRANT ALL ON TABLE "public"."applicants" TO "authenticated";
GRANT ALL ON TABLE "public"."applicants" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "service_role";
GRANT SELECT ON TABLE "public"."audit_log" TO "authenticated";



GRANT ALL ON TABLE "public"."billing_payment_attempts" TO "service_role";
GRANT SELECT ON TABLE "public"."billing_payment_attempts" TO "authenticated";



GRANT ALL ON TABLE "public"."booking_cargo_items" TO "anon";
GRANT ALL ON TABLE "public"."booking_cargo_items" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_cargo_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."booking_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."booking_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."booking_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."career_postings" TO "anon";
GRANT ALL ON TABLE "public"."career_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."career_postings" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_threads" TO "anon";
GRANT ALL ON TABLE "public"."chat_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_threads" TO "service_role";



GRANT ALL ON TABLE "public"."clock_entries" TO "anon";
GRANT ALL ON TABLE "public"."clock_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."clock_entries" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_subscriptions" TO "service_role";
GRANT SELECT ON TABLE "public"."company_subscriptions" TO "authenticated";



GRANT ALL ON TABLE "public"."company_workspace_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_workspace_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_workspace_settings" TO "service_role";



GRANT ALL ON TABLE "public"."crm_sheet_cells" TO "anon";
GRANT ALL ON TABLE "public"."crm_sheet_cells" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_sheet_cells" TO "service_role";



GRANT ALL ON TABLE "public"."crm_sheet_tabs" TO "anon";
GRANT ALL ON TABLE "public"."crm_sheet_tabs" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_sheet_tabs" TO "service_role";



GRANT ALL ON TABLE "public"."customer_erp_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_erp_leads" TO "service_role";



GRANT ALL ON TABLE "public"."customer_inventory" TO "anon";
GRANT ALL ON TABLE "public"."customer_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."customer_lead_notes" TO "anon";
GRANT ALL ON TABLE "public"."customer_lead_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_lead_notes" TO "service_role";



GRANT ALL ON TABLE "public"."customer_leads" TO "anon";
GRANT ALL ON TABLE "public"."customer_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_leads" TO "service_role";



GRANT ALL ON TABLE "public"."customer_notes" TO "anon";
GRANT ALL ON TABLE "public"."customer_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_notes" TO "service_role";



GRANT ALL ON TABLE "public"."customer_own_invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."customer_own_invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_own_invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."customer_own_invoices" TO "anon";
GRANT ALL ON TABLE "public"."customer_own_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_own_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."customer_team_members" TO "anon";
GRANT ALL ON TABLE "public"."customer_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_team_members" TO "service_role";



GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."customers" TO "anon";
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."driver_onboarding_links" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."employee_letters" TO "anon";
GRANT ALL ON TABLE "public"."employee_letters" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_letters" TO "service_role";



GRANT ALL ON TABLE "public"."employee_ratings" TO "anon";
GRANT ALL ON TABLE "public"."employee_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."employee_recognition_public" TO "anon";
GRANT ALL ON TABLE "public"."employee_recognition_public" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_recognition_public" TO "service_role";



GRANT ALL ON TABLE "public"."employee_year_votes" TO "anon";
GRANT ALL ON TABLE "public"."employee_year_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_year_votes" TO "service_role";



GRANT ALL ON TABLE "public"."expense_items" TO "anon";
GRANT ALL ON TABLE "public"."expense_items" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_items" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."fleet_insurance" TO "anon";
GRANT ALL ON TABLE "public"."fleet_insurance" TO "authenticated";
GRANT ALL ON TABLE "public"."fleet_insurance" TO "service_role";



GRANT ALL ON TABLE "public"."fleet_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."fleet_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."fleet_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."fleet_vehicles" TO "anon";
GRANT ALL ON TABLE "public"."fleet_vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."fleet_vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."gmail_connections" TO "anon";
GRANT ALL ON TABLE "public"."gmail_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."gmail_connections" TO "service_role";



GRANT ALL ON TABLE "public"."google_calendar_tokens" TO "anon";
GRANT ALL ON TABLE "public"."google_calendar_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."google_calendar_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."hr_documents" TO "anon";
GRANT ALL ON TABLE "public"."hr_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_documents" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_branding" TO "anon";
GRANT ALL ON TABLE "public"."invoice_branding" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_branding" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."jaad_platform_config" TO "service_role";



GRANT ALL ON TABLE "public"."kb_articles" TO "anon";
GRANT ALL ON TABLE "public"."kb_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."kb_articles" TO "service_role";



GRANT ALL ON TABLE "public"."lead_notes" TO "anon";
GRANT ALL ON TABLE "public"."lead_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_notes" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."live_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."live_chats" TO "anon";
GRANT ALL ON TABLE "public"."live_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."live_chats" TO "service_role";



GRANT ALL ON TABLE "public"."manifest_bookings" TO "anon";
GRANT ALL ON TABLE "public"."manifest_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."manifest_bookings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."manifest_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."manifest_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."manifest_seq" TO "service_role";



GRANT ALL ON TABLE "public"."manifest_shipments" TO "anon";
GRANT ALL ON TABLE "public"."manifest_shipments" TO "authenticated";
GRANT ALL ON TABLE "public"."manifest_shipments" TO "service_role";



GRANT ALL ON TABLE "public"."manifests" TO "anon";
GRANT ALL ON TABLE "public"."manifests" TO "authenticated";
GRANT ALL ON TABLE "public"."manifests" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."proof_of_delivery" TO "anon";
GRANT ALL ON TABLE "public"."proof_of_delivery" TO "authenticated";
GRANT ALL ON TABLE "public"."proof_of_delivery" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sheet_cells" TO "anon";
GRANT ALL ON TABLE "public"."sheet_cells" TO "authenticated";
GRANT ALL ON TABLE "public"."sheet_cells" TO "service_role";



GRANT ALL ON TABLE "public"."support_calls" TO "anon";
GRANT ALL ON TABLE "public"."support_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."support_calls" TO "service_role";



GRANT ALL ON TABLE "public"."support_emails" TO "anon";
GRANT ALL ON TABLE "public"."support_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."support_emails" TO "service_role";



GRANT ALL ON TABLE "public"."support_inbound_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."support_sms" TO "anon";
GRANT ALL ON TABLE "public"."support_sms" TO "authenticated";
GRANT ALL ON TABLE "public"."support_sms" TO "service_role";



GRANT ALL ON TABLE "public"."support_whatsapp" TO "anon";
GRANT ALL ON TABLE "public"."support_whatsapp" TO "authenticated";
GRANT ALL ON TABLE "public"."support_whatsapp" TO "service_role";



GRANT ALL ON TABLE "public"."team_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."team_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."team_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tracking_events" TO "service_role";



REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "storage"."buckets" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";



REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "storage"."objects" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




