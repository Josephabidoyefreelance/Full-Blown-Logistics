-- JAAD Logistics Stage 2 coordinated migration (2026-11-03)
-- IMPORTANT: Back up first. Apply only with the matching application patch.
-- Does not alter existing row ownership, customer/company IDs, or design.
-- This migration does not claim to complete live production authorization tests.
BEGIN;

-- A customer tenancy is based on verified customer ownership or accepted active
-- staff membership. JAAD administrative profiles are NOT customer authorization.
CREATE OR REPLACE FUNCTION public.jaad_customer_is_tenant_member(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.id = p_tenant AND lower(c.status) = 'active'
    AND (c.user_id = (SELECT auth.uid()) OR EXISTS (
       SELECT 1 FROM public.customer_team_members m
       WHERE m.customer_id = c.id AND m.user_id = (SELECT auth.uid())
         AND lower(m.status) = 'active' AND m.accepted_at IS NOT NULL
    ))
 );
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_has_tenant_module(p_tenant uuid, p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.id = p_tenant AND lower(c.status) = 'active'
    AND (
      c.user_id = (SELECT auth.uid())
      OR EXISTS (
       SELECT 1 FROM public.customer_team_members m
       WHERE m.customer_id = c.id AND m.user_id = (SELECT auth.uid())
         AND lower(m.status) = 'active' AND m.accepted_at IS NOT NULL
         AND (
           p_module = ANY(m.permitted_modules)
           OR (p_module = 'crm' AND 'leads' = ANY(m.permitted_modules))
           OR (p_module = 'customers' AND 'leads' = ANY(m.permitted_modules))
           OR (p_module = 'finance' AND ('invoices' = ANY(m.permitted_modules) OR 'report' = ANY(m.permitted_modules)))
           OR (p_module = 'warehouse' AND 'inventory' = ANY(m.permitted_modules))
           OR (p_module = 'reports' AND 'report' = ANY(m.permitted_modules))
         )
      )
    )
 );
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_is_company_member(p_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_company IS NOT NULL AND (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.company_id = p_company AND lower(c.status) = 'active'
    AND (c.user_id = (SELECT auth.uid()) OR EXISTS (
       SELECT 1 FROM public.customer_team_members m
       WHERE m.customer_id = c.id AND m.user_id = (SELECT auth.uid())
         AND lower(m.status) = 'active' AND m.accepted_at IS NOT NULL
    ))
 );
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_has_company_module(p_company uuid, p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_company IS NOT NULL AND (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.company_id = p_company AND lower(c.status) = 'active'
    AND public.jaad_customer_has_tenant_module(c.id, p_module)
 );
$$;

-- Legacy portal tables are keyed by owner user_id, not customer id.
-- Fail closed for ambiguous owner IDs rather than mixing two owned tenants.
CREATE OR REPLACE FUNCTION public.jaad_customer_unique_id_for_owner(p_owner uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN count(*) = 1 THEN (array_agg(id ORDER BY id))[1] ELSE NULL::uuid END
 FROM public.customers c WHERE c.user_id = p_owner;
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_has_owner_module(p_owner uuid, p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.jaad_customer_has_tenant_module(public.jaad_customer_unique_id_for_owner(p_owner), p_module);
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_company_for_owner(p_owner uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT c.company_id FROM public.customers c
 WHERE c.id = public.jaad_customer_unique_id_for_owner(p_owner)
   AND lower(c.status) = 'active';
$$;

-- Never select an arbitrary membership. Retained for older portal consumers:
-- the zero/multiple-tenant case denies rather than choosing a first record.
CREATE OR REPLACE FUNCTION public.jaad_unique_customer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 WITH eligible AS (
   SELECT c.id FROM public.customers c
   WHERE c.user_id = (SELECT auth.uid()) AND lower(c.status) = 'active'
   UNION
   SELECT c.id FROM public.customer_team_members m
   JOIN public.customers c ON c.id = m.customer_id
   WHERE m.user_id = (SELECT auth.uid()) AND lower(m.status) = 'active'
     AND m.accepted_at IS NOT NULL AND lower(c.status) = 'active'
 )
 SELECT CASE WHEN count(*) = 1 THEN (array_agg(id ORDER BY id))[1] ELSE NULL::uuid END FROM eligible;
$$;

CREATE OR REPLACE FUNCTION public.effective_customer_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT c.user_id FROM public.customers c
 WHERE c.id = public.jaad_unique_customer_id() AND lower(c.status) = 'active';
$$;

CREATE OR REPLACE FUNCTION public.customer_permitted_modules()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE
   WHEN c.id IS NULL THEN ARRAY[]::text[]
   WHEN c.user_id = (SELECT auth.uid()) THEN
      ARRAY['overview','inventory','leads','shipments','track','invoices',
            'notes','report','support','profile','calculator','utilities']::text[]
   ELSE COALESCE((SELECT m.permitted_modules FROM public.customer_team_members m
        WHERE m.customer_id = c.id AND m.user_id = (SELECT auth.uid())
          AND lower(m.status) = 'active' AND m.accepted_at IS NOT NULL
        ORDER BY m.accepted_at DESC, m.id LIMIT 1), ARRAY[]::text[])
 END
 FROM (SELECT public.jaad_unique_customer_id() AS id) s
 LEFT JOIN public.customers c ON c.id = s.id;
$$;

CREATE OR REPLACE FUNCTION public.customer_has_module(module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT module_key = ANY(public.customer_permitted_modules());
$$;

CREATE OR REPLACE FUNCTION public.customer_id_for_active_staff(uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN count(DISTINCT m.customer_id) = 1 THEN (array_agg(m.customer_id ORDER BY m.customer_id))[1] ELSE NULL::uuid END
 FROM public.customer_team_members m JOIN public.customers c ON c.id = m.customer_id
 WHERE uid = (SELECT auth.uid()) AND m.user_id = uid
   AND lower(m.status) = 'active' AND m.accepted_at IS NOT NULL
   AND lower(c.status) = 'active';
$$;

CREATE OR REPLACE FUNCTION public.jaad_my_customer_tenants()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT c.id FROM public.customers c
 WHERE c.user_id = (SELECT auth.uid()) AND lower(c.status) = 'active'
 UNION
 SELECT c.id FROM public.customer_team_members m
 JOIN public.customers c ON c.id = m.customer_id
 WHERE m.user_id = (SELECT auth.uid()) AND lower(m.status) = 'active'
   AND m.accepted_at IS NOT NULL AND lower(c.status) = 'active';
$$;

-- Lock down direct execution of security-definer functions.
DO $$ DECLARE fn text; BEGIN
 FOREACH fn IN ARRAY ARRAY[
  'jaad_customer_is_tenant_member(uuid)', 'jaad_customer_has_tenant_module(uuid,text)',
  'jaad_customer_is_company_member(uuid)', 'jaad_customer_has_company_module(uuid,text)',
  'jaad_customer_unique_id_for_owner(uuid)', 'jaad_customer_has_owner_module(uuid,text)',
  'jaad_customer_company_for_owner(uuid)', 'jaad_unique_customer_id()',
  'effective_customer_user_id()', 'customer_permitted_modules()',
  'customer_has_module(text)', 'customer_id_for_active_staff(uuid)',
  'jaad_my_customer_tenants()'
 ] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
 END LOOP;
END $$;

-- Customer workspace/company metadata now accepts verified customer membership,
-- without changing administrator company membership rules.
DROP POLICY IF EXISTS jaad_customer_company_read ON public.companies;
CREATE POLICY jaad_customer_company_read ON public.companies FOR SELECT TO authenticated
 USING (public.jaad_customer_is_company_member(id));
DROP POLICY IF EXISTS jaad_customer_subscription_read ON public.company_subscriptions;
CREATE POLICY jaad_customer_subscription_read ON public.company_subscriptions FOR SELECT TO authenticated
 USING (public.jaad_customer_is_company_member(company_id));
DROP POLICY IF EXISTS jaad_customer_workspace_settings_read ON public.company_workspace_settings;
CREATE POLICY jaad_customer_workspace_settings_read ON public.company_workspace_settings FOR SELECT TO authenticated
 USING (public.jaad_customer_is_company_member(company_id));

-- Administrative profile and customer staff listing are separate identities.
DROP POLICY IF EXISTS jaad_profiles_company_guard ON public.profiles;
CREATE POLICY jaad_profiles_company_guard ON public.profiles AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
  id = (SELECT auth.uid()) OR
  (company_id IS NOT NULL AND (company_id = public.jaad_current_company_id()
                                OR public.jaad_customer_is_company_member(company_id)))
 );
DROP POLICY IF EXISTS jaad_customer_profiles_read ON public.profiles;
CREATE POLICY jaad_customer_profiles_read ON public.profiles FOR SELECT TO authenticated
 USING (public.jaad_customer_is_company_member(company_id));

-- Self-service may view/update own customer row; team members may view their
-- active business record. Only admin-company users or owners may update.
DROP POLICY IF EXISTS "Customers can view and update their own row" ON public.customers;
DROP POLICY IF EXISTS "Staff can view their owning business row" ON public.customers;
DROP POLICY IF EXISTS jaad_company_isolation_guard ON public.customers;
DROP POLICY IF EXISTS jaad_customer_row_select_guard ON public.customers;
CREATE POLICY jaad_customer_row_select_guard ON public.customers AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
   (company_id IS NOT NULL AND company_id = public.jaad_current_company_id())
   OR user_id = (SELECT auth.uid()) OR public.jaad_customer_is_tenant_member(id)
 );
DROP POLICY IF EXISTS jaad_customer_row_insert_guard ON public.customers;
CREATE POLICY jaad_customer_row_insert_guard ON public.customers AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (
   (company_id IS NOT NULL AND company_id = public.jaad_current_company_id())
   OR (user_id = (SELECT auth.uid()) AND
       (company_id IS NULL OR EXISTS (
         SELECT 1 FROM public.companies co
         WHERE co.id = company_id AND co.owner_user_id = (SELECT auth.uid())
       )))
 );
DROP POLICY IF EXISTS jaad_customer_row_update_guard ON public.customers;
CREATE POLICY jaad_customer_row_update_guard ON public.customers AS RESTRICTIVE
 FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND company_id = public.jaad_current_company_id())
  OR user_id = (SELECT auth.uid())
 ) WITH CHECK (
  (company_id IS NOT NULL AND company_id = public.jaad_current_company_id())
  OR user_id = (SELECT auth.uid())
 );
DROP POLICY IF EXISTS jaad_customer_row_delete_guard ON public.customers;
CREATE POLICY jaad_customer_row_delete_guard ON public.customers AS RESTRICTIVE
 FOR DELETE TO authenticated USING (
  company_id IS NOT NULL AND company_id = public.jaad_current_company_id()
  AND public.auth_has_module('customers')
 );
DROP POLICY IF EXISTS jaad_customer_staff_row_select ON public.customers;
CREATE POLICY jaad_customer_staff_row_select ON public.customers
 FOR SELECT TO authenticated USING (public.jaad_customer_is_tenant_member(id));

-- The original snapshot had an ALL self-policy allowing DELETE. This is
-- intentionally not restored. Preserve the user's earlier column-grant fix.
REVOKE INSERT, UPDATE, DELETE ON public.customers FROM anon;
REVOKE UPDATE ON public.customers FROM authenticated;
GRANT UPDATE (first_name, last_name, name, contact, phone, avatar_url,
 timezone, address, company_name, business_address, logo_url, support_phone)
 ON public.customers TO authenticated;

-- Tenant CRM: restrict *each row* to its own customer membership + leads module.
DROP POLICY IF EXISTS jaad_company_parent_guard ON public.customer_erp_leads;
DROP POLICY IF EXISTS customer_erp_leads_select ON public.customer_erp_leads;
DROP POLICY IF EXISTS customer_erp_leads_insert ON public.customer_erp_leads;
DROP POLICY IF EXISTS customer_erp_leads_update ON public.customer_erp_leads;
DROP POLICY IF EXISTS customer_erp_leads_delete ON public.customer_erp_leads;
CREATE POLICY customer_erp_leads_select ON public.customer_erp_leads FOR SELECT TO authenticated
 USING (public.jaad_customer_has_tenant_module(tenant_customer_id, 'leads'));
CREATE POLICY customer_erp_leads_insert ON public.customer_erp_leads FOR INSERT TO authenticated
 WITH CHECK (public.jaad_customer_has_tenant_module(tenant_customer_id, 'leads')
  AND created_by = (SELECT auth.uid()));
CREATE POLICY customer_erp_leads_update ON public.customer_erp_leads FOR UPDATE TO authenticated
 USING (public.jaad_customer_has_tenant_module(tenant_customer_id, 'leads'))
 WITH CHECK (public.jaad_customer_has_tenant_module(tenant_customer_id, 'leads'));
CREATE POLICY customer_erp_leads_delete ON public.customer_erp_leads FOR DELETE TO authenticated
 USING (public.jaad_customer_has_tenant_module(tenant_customer_id, 'leads'));

-- Legacy portal child-table guards previously required the owner's JAAD admin
-- profile company, which is unrelated to customer membership. The policies
-- below replace that check with authenticated parent-row authorization.
DROP POLICY IF EXISTS jaad_company_parent_guard ON public.customer_lead_notes;
DROP POLICY IF EXISTS jaad_company_parent_guard ON public.customer_own_invoice_items;

-- Legacy portal tables: permissions are evaluated for the OWNER OF EACH ROW.
-- Never combine one user's owner identity with another membership's modules.
DROP POLICY IF EXISTS "Customers manage their own inventory" ON public.customer_inventory;
CREATE POLICY "Customers manage their own inventory" ON public.customer_inventory TO authenticated
 USING (public.jaad_customer_has_owner_module(user_id, 'inventory'))
 WITH CHECK (public.jaad_customer_has_owner_module(user_id, 'inventory'));
DROP POLICY IF EXISTS "Customers manage their own leads" ON public.customer_leads;
CREATE POLICY "Customers manage their own leads" ON public.customer_leads TO authenticated
 USING (public.jaad_customer_has_owner_module(user_id, 'leads'))
 WITH CHECK (public.jaad_customer_has_owner_module(user_id, 'leads'));
DROP POLICY IF EXISTS "Customers manage their own personal invoices" ON public.customer_own_invoices;
CREATE POLICY "Customers manage their own personal invoices" ON public.customer_own_invoices TO authenticated
 USING (public.jaad_customer_has_owner_module(user_id, 'invoices'))
 WITH CHECK (public.jaad_customer_has_owner_module(user_id, 'invoices'));
DROP POLICY IF EXISTS "Customers manage items on their own invoices" ON public.customer_own_invoice_items;
CREATE POLICY "Customers manage items on their own invoices" ON public.customer_own_invoice_items TO authenticated
 USING (EXISTS (SELECT 1 FROM public.customer_own_invoices i WHERE i.id = invoice_id
   AND public.jaad_customer_has_owner_module(i.user_id, 'invoices')))
 WITH CHECK (EXISTS (SELECT 1 FROM public.customer_own_invoices i WHERE i.id = invoice_id
   AND public.jaad_customer_has_owner_module(i.user_id, 'invoices')));
DROP POLICY IF EXISTS "Customers manage notes on their own leads" ON public.customer_lead_notes;
CREATE POLICY "Customers manage notes on their own leads" ON public.customer_lead_notes TO authenticated
 USING (EXISTS (SELECT 1 FROM public.customer_leads l WHERE l.id = lead_id
   AND public.jaad_customer_has_owner_module(l.user_id, 'leads')))
 WITH CHECK (EXISTS (SELECT 1 FROM public.customer_leads l WHERE l.id = lead_id
   AND public.jaad_customer_has_owner_module(l.user_id, 'leads')));

-- Protected company data remains admin-company scoped OR customer-company
-- scoped with explicit customer module permission. No unrestricted OR true.
-- Existing admin permissive policies stay intact. New customer policies are
-- qualified by both company_id and membership/module.
DO $migration$
DECLARE entry record;
BEGIN
 FOR entry IN SELECT * FROM (VALUES
  ('bookings','shipments'), ('booking_cargo_items','shipments'),
  ('chat_messages','support'), ('chat_threads','support'),
  ('clock_entries','clock-tracker'), ('crm_sheet_cells','crm'), ('crm_sheet_tabs','crm'),
  ('drivers','drivers'), ('employees','hr'), ('expenses','finance'),
  ('fleet_maintenance','fleet'), ('fleet_vehicles','fleet'),
  ('inventory_items','warehouse'), ('invoice_items','finance'), ('invoices','finance'),
  ('lead_notes','crm'), ('leads','crm'), ('leave_requests','hr'),
  ('live_chat_messages','support'), ('live_chats','support'),
  ('manifests','shipments'), ('notifications','overview'),
  ('proof_of_delivery','shipments'), ('purchase_orders','warehouse'),
  ('quotations','crm'), ('returns','shipments'),
  ('support_calls','support'), ('support_emails','support'),
  ('support_sms','support'), ('support_whatsapp','support'),
  ('team_chat_messages','chat'), ('tickets','support')
 ) AS d(table_name,module_name) LOOP
  IF to_regclass('public.' || quote_ident(entry.table_name)) IS NULL THEN
    RAISE EXCEPTION 'Expected tenant table public.% missing', entry.table_name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=entry.table_name AND column_name='company_id') THEN
    RAISE EXCEPTION 'public.% missing company_id', entry.table_name;
  END IF;
  EXECUTE format('DROP POLICY IF EXISTS jaad_company_isolation_guard ON public.%I', entry.table_name);
  EXECUTE format('CREATE POLICY jaad_company_isolation_guard ON public.%I AS RESTRICTIVE TO authenticated
    USING (company_id = public.jaad_current_company_id() OR public.jaad_customer_has_company_module(company_id, %L))
    WITH CHECK (company_id = public.jaad_current_company_id() OR public.jaad_customer_has_company_module(company_id, %L))',
     entry.table_name, entry.module_name, entry.module_name);
  EXECUTE format('DROP POLICY IF EXISTS jaad_customer_company_module_access ON public.%I', entry.table_name);
  EXECUTE format('CREATE POLICY jaad_customer_company_module_access ON public.%I TO authenticated
    USING (public.jaad_customer_has_company_module(company_id, %L))
    WITH CHECK (public.jaad_customer_has_company_module(company_id, %L))',
     entry.table_name, entry.module_name, entry.module_name);
 END LOOP;
END $migration$;

-- Company-ID-bearing child records must also belong to the SAME company
-- as their referenced parent. Otherwise a valid customer could link data
-- into another company's parent row despite passing their own company check.
DO $child_guard$
DECLARE entry record; predicate text;
BEGIN
 FOR entry IN SELECT * FROM (VALUES
   ('booking_cargo_items','bookings','booking_id'),
   ('invoice_items','invoices','invoice_id'),
   ('lead_notes','leads','lead_id'),
   ('fleet_maintenance','fleet_vehicles','vehicle_id'),
   ('crm_sheet_cells','crm_sheet_tabs','sheet_id'),
   ('chat_messages','chat_threads','thread_id'),
   ('live_chat_messages','live_chats','chat_id'),
   ('returns','bookings','booking_id'),
   ('proof_of_delivery','bookings','booking_id')
 ) AS e(child_table,parent_table,parent_fk) LOOP
  predicate := format('EXISTS (SELECT 1 FROM public.%I p
       WHERE p.id = %I.%I AND p.company_id = %I.company_id)',
       entry.parent_table,entry.child_table,entry.parent_fk,entry.child_table);
  EXECUTE format('DROP POLICY IF EXISTS jaad_company_parent_consistency ON public.%I',entry.child_table);
  EXECUTE format('CREATE POLICY jaad_company_parent_consistency ON public.%I AS RESTRICTIVE TO authenticated
    USING (%s) WITH CHECK (%s)',entry.child_table,predicate,predicate);
 END LOOP;
END $child_guard$;
-- Optional references on invoices are checked when provided.
DROP POLICY IF EXISTS jaad_invoice_booking_consistency ON public.invoices;
CREATE POLICY jaad_invoice_booking_consistency ON public.invoices AS RESTRICTIVE TO authenticated
 USING (linked_booking_id IS NULL OR EXISTS (
   SELECT 1 FROM public.bookings b WHERE b.id = linked_booking_id AND b.company_id = invoices.company_id))
 WITH CHECK (linked_booking_id IS NULL OR EXISTS (
   SELECT 1 FROM public.bookings b WHERE b.id = linked_booking_id AND b.company_id = invoices.company_id));

-- Parent-scoped tenant tables have no company_id of their own. Verify the
-- parent company and preserve the original admin access without a blind grant.
DO $parent_guards$
DECLARE entry record; predicate text;
BEGIN
 FOR entry IN SELECT * FROM (VALUES
  ('employee_letters','employees','employee_id','hr'),
  ('employee_ratings','employees','employee_id','hr'),
  ('expense_items','expenses','expense_id','finance'),
  ('fleet_insurance','fleet_vehicles','vehicle_id','fleet'),
  ('hr_documents','employees','employee_id','hr')
 ) AS p(child_table,parent_table,fk,module_name) LOOP
  predicate := format('EXISTS (SELECT 1 FROM public.%I parent WHERE parent.id = %I.%I AND
    (parent.company_id = public.jaad_current_company_id() OR
     public.jaad_customer_has_company_module(parent.company_id, %L)))',
      entry.parent_table, entry.child_table, entry.fk, entry.module_name);
  EXECUTE format('DROP POLICY IF EXISTS jaad_company_parent_guard ON public.%I',entry.child_table);
  EXECUTE format('CREATE POLICY jaad_company_parent_guard ON public.%I AS RESTRICTIVE TO authenticated
    USING (%s) WITH CHECK (%s)',entry.child_table,predicate,predicate);
  predicate := format('EXISTS (SELECT 1 FROM public.%I parent WHERE parent.id = %I.%I
     AND public.jaad_customer_has_company_module(parent.company_id, %L))',
      entry.parent_table, entry.child_table, entry.fk, entry.module_name);
  EXECUTE format('DROP POLICY IF EXISTS jaad_customer_parent_module_access ON public.%I',entry.child_table);
  EXECUTE format('CREATE POLICY jaad_customer_parent_module_access ON public.%I TO authenticated
    USING (%s) WITH CHECK (%s)',entry.child_table,predicate,predicate);
 END LOOP;
 FOR entry IN SELECT * FROM (VALUES
  ('manifest_bookings'), ('manifest_shipments')
 ) AS p(child_table) LOOP
  predicate := format('EXISTS (SELECT 1 FROM public.manifests m
    JOIN public.bookings b ON b.id = %I.booking_id
    WHERE m.id = %I.manifest_id AND m.company_id = b.company_id AND
    (m.company_id = public.jaad_current_company_id()
     OR public.jaad_customer_has_company_module(m.company_id, %L)))',entry.child_table,entry.child_table,'shipments');
  EXECUTE format('DROP POLICY IF EXISTS jaad_company_parent_guard ON public.%I',entry.child_table);
  EXECUTE format('CREATE POLICY jaad_company_parent_guard ON public.%I AS RESTRICTIVE TO authenticated
     USING (%s) WITH CHECK (%s)',entry.child_table,predicate,predicate);
  predicate := format('EXISTS (SELECT 1 FROM public.manifests m
    JOIN public.bookings b ON b.id = %I.booking_id
    WHERE m.id = %I.manifest_id AND m.company_id = b.company_id AND
     public.jaad_customer_has_company_module(m.company_id, %L))',entry.child_table,entry.child_table,'shipments');
  EXECUTE format('DROP POLICY IF EXISTS jaad_customer_parent_module_access ON public.%I',entry.child_table);
  EXECUTE format('CREATE POLICY jaad_customer_parent_module_access ON public.%I TO authenticated
     USING (%s) WITH CHECK (%s)',entry.child_table,predicate,predicate);
 END LOOP;
END $parent_guards$;

-- Legacy bookings still require exact owner ID for their customer portal policy.
DROP POLICY IF EXISTS "Customers can create their own bookings" ON public.bookings;
CREATE POLICY "Customers can create their own bookings" ON public.bookings FOR INSERT TO authenticated
 WITH CHECK (company_id = public.jaad_customer_company_for_owner(user_id)
   AND public.jaad_customer_has_owner_module(user_id, 'shipments'));
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings" ON public.bookings FOR SELECT TO authenticated
 USING (company_id = public.jaad_customer_company_for_owner(user_id)
   AND (public.jaad_customer_has_owner_module(user_id, 'shipments')
     OR public.jaad_customer_has_owner_module(user_id, 'track')
     OR public.jaad_customer_has_owner_module(user_id, 'overview')));
DROP POLICY IF EXISTS "Customers access their own booking cargo items" ON public.booking_cargo_items;
CREATE POLICY "Customers access their own booking cargo items" ON public.booking_cargo_items TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
     AND b.company_id = booking_cargo_items.company_id
     AND b.company_id = public.jaad_customer_company_for_owner(b.user_id)
     AND (public.jaad_customer_has_owner_module(b.user_id, 'shipments')
       OR public.jaad_customer_has_owner_module(b.user_id, 'track')
       OR public.jaad_customer_has_owner_module(b.user_id, 'overview'))))
 WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
     AND b.company_id = booking_cargo_items.company_id
     AND b.company_id = public.jaad_customer_company_for_owner(b.user_id)
     AND public.jaad_customer_has_owner_module(b.user_id, 'shipments')));

-- Tables with pre-existing admin-only company predicates (rather than a
-- jaad_company_isolation_guard) also need an explicit verified customer policy.
DROP POLICY IF EXISTS jaad_customer_invoice_branding_access ON public.invoice_branding;
CREATE POLICY jaad_customer_invoice_branding_access ON public.invoice_branding TO authenticated
 USING (public.jaad_customer_has_company_module(company_id, 'finance'))
 WITH CHECK (public.jaad_customer_has_company_module(company_id, 'finance'));
DROP POLICY IF EXISTS jaad_customer_applicants_access ON public.applicants;
CREATE POLICY jaad_customer_applicants_access ON public.applicants TO authenticated
 USING (public.jaad_customer_has_company_module(company_id, 'hr'))
 WITH CHECK (public.jaad_customer_has_company_module(company_id, 'hr'));
DROP POLICY IF EXISTS jaad_customer_career_insert ON public.career_postings;
CREATE POLICY jaad_customer_career_insert ON public.career_postings FOR INSERT TO authenticated
 WITH CHECK (public.jaad_customer_has_company_module(company_id, 'hr'));
DROP POLICY IF EXISTS jaad_customer_career_update ON public.career_postings;
CREATE POLICY jaad_customer_career_update ON public.career_postings FOR UPDATE TO authenticated
 USING (public.jaad_customer_has_company_module(company_id, 'hr'))
 WITH CHECK (public.jaad_customer_has_company_module(company_id, 'hr'));
DROP POLICY IF EXISTS jaad_customer_career_delete ON public.career_postings;
CREATE POLICY jaad_customer_career_delete ON public.career_postings FOR DELETE TO authenticated
 USING (public.jaad_customer_has_company_module(company_id, 'hr'));
DROP POLICY IF EXISTS jaad_customer_sheet_cells_access ON public.sheet_cells;
CREATE POLICY jaad_customer_sheet_cells_access ON public.sheet_cells TO authenticated
 USING (public.jaad_customer_has_company_module(company_id, 'crm'))
 WITH CHECK (public.jaad_customer_has_company_module(company_id, 'crm'));

-- SQL trigger must no longer force customer workspace writes into an unrelated
-- admin profile's company. It respects *explicit*, authorized company_id.
CREATE OR REPLACE FUNCTION public.jaad_assign_company_on_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 admin_tenant uuid;
 module_key text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'authenticated' THEN RETURN NEW; END IF;
 admin_tenant := public.jaad_current_company_id();
 module_key := CASE TG_TABLE_NAME
   WHEN 'bookings' THEN 'shipments' WHEN 'booking_cargo_items' THEN 'shipments'
   WHEN 'chat_messages' THEN 'support' WHEN 'chat_threads' THEN 'support'
   WHEN 'clock_entries' THEN 'clock-tracker'
   WHEN 'crm_sheet_cells' THEN 'crm' WHEN 'crm_sheet_tabs' THEN 'crm'
   WHEN 'drivers' THEN 'drivers' WHEN 'employees' THEN 'hr'
   WHEN 'expenses' THEN 'finance' WHEN 'fleet_maintenance' THEN 'fleet'
   WHEN 'fleet_vehicles' THEN 'fleet' WHEN 'inventory_items' THEN 'warehouse'
   WHEN 'invoice_items' THEN 'finance' WHEN 'invoices' THEN 'finance'
   WHEN 'lead_notes' THEN 'crm' WHEN 'leads' THEN 'crm'
   WHEN 'leave_requests' THEN 'hr' WHEN 'live_chat_messages' THEN 'support'
   WHEN 'live_chats' THEN 'support' WHEN 'manifests' THEN 'shipments'
   WHEN 'notifications' THEN 'overview' WHEN 'proof_of_delivery' THEN 'shipments'
   WHEN 'purchase_orders' THEN 'warehouse' WHEN 'quotations' THEN 'crm'
   WHEN 'returns' THEN 'shipments' WHEN 'support_calls' THEN 'support'
   WHEN 'support_emails' THEN 'support' WHEN 'support_sms' THEN 'support'
   WHEN 'support_whatsapp' THEN 'support' WHEN 'team_chat_messages' THEN 'chat'
   WHEN 'tickets' THEN 'support' ELSE NULL END;
 IF TG_OP = 'INSERT' THEN
   IF NEW.company_id IS NULL THEN
     -- Self-service customer identity never silently inherits the admin portal
     -- company, even when the same user is also a JAAD Super Admin.
     IF TG_TABLE_NAME = 'customers' AND NEW.user_id = (SELECT auth.uid())
       THEN RETURN NEW; END IF;
     IF admin_tenant IS NULL THEN RAISE EXCEPTION 'An authorized company_id is required'; END IF;
     NEW.company_id := admin_tenant;
   END IF;
   IF NEW.company_id = admin_tenant THEN RETURN NEW; END IF;
   IF TG_TABLE_NAME = 'customers' THEN
      IF NEW.user_id = (SELECT auth.uid()) AND EXISTS (
        SELECT 1 FROM public.companies co WHERE co.id = NEW.company_id
          AND co.owner_user_id = (SELECT auth.uid())
      ) THEN RETURN NEW; END IF;
   ELSIF module_key IS NOT NULL AND public.jaad_customer_has_company_module(NEW.company_id, module_key) THEN
      RETURN NEW;
   END IF;
   RAISE EXCEPTION 'Cross-company insert is not allowed';
 ELSE
   IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
     RAISE EXCEPTION 'Changing record company is not allowed';
   END IF;
   IF OLD.company_id IS NOT NULL AND OLD.company_id = admin_tenant THEN RETURN NEW; END IF;
   IF TG_TABLE_NAME = 'customers' AND OLD.user_id = (SELECT auth.uid()) THEN RETURN NEW; END IF;
   IF module_key IS NOT NULL AND public.jaad_customer_has_company_module(OLD.company_id, module_key) THEN
     RETURN NEW;
   END IF;
   RAISE EXCEPTION 'Cross-company update is not allowed';
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_assign_company_on_write() FROM PUBLIC, anon, authenticated;

-- Prevent moving a previously owned record into a different tenant via UPDATE.
-- These columns are immutable after creation for authenticated clients.
CREATE OR REPLACE FUNCTION public.jaad_protect_customer_row_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'authenticated' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME = 'customer_erp_leads' THEN
    IF NEW.tenant_customer_id IS DISTINCT FROM OLD.tenant_customer_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Changing CRM lead tenant or creator is not permitted';
    END IF;
 ELSIF TG_TABLE_NAME IN ('customer_inventory','customer_leads','customer_own_invoices','bookings') THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Changing customer record owner is not permitted';
    END IF;
 ELSIF TG_TABLE_NAME = 'customer_team_members' THEN
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
      RAISE EXCEPTION 'Changing staff tenant is not permitted';
    END IF;
    -- A NULL invitee user_id may only be bound to the actual signed-in,
    -- verified invite recipient during explicit acceptance. No reassignment
    -- of accepted staff IDs is ever permitted.
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      IF NOT (OLD.user_id IS NULL AND OLD.status='Invited'
        AND NEW.status='Active' AND NEW.accepted_at IS NOT NULL
        AND NEW.user_id=(SELECT auth.uid())
        AND lower(trim(OLD.email)) = (
          SELECT lower(trim(u.email)) FROM auth.users u
          WHERE u.id=(SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL))
      THEN RAISE EXCEPTION 'Changing staff identity is not permitted';
      END IF;
    END IF;
 ELSIF TG_TABLE_NAME = 'customer_lead_notes' THEN
    IF NEW.lead_id IS DISTINCT FROM OLD.lead_id THEN
      RAISE EXCEPTION 'Changing parent lead is not permitted';
    END IF;
 ELSIF TG_TABLE_NAME = 'customer_own_invoice_items' THEN
    IF NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
      RAISE EXCEPTION 'Changing parent invoice is not permitted';
    END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_protect_customer_row_tenant() FROM PUBLIC, anon, authenticated;
DO $triggers$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY[
 'customer_erp_leads','customer_inventory','customer_leads',
 'customer_own_invoices','customer_team_members','customer_lead_notes',
 'customer_own_invoice_items','bookings'
 ] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS jaad_protect_customer_row_tenant ON public.%I',tbl);
  EXECUTE format('CREATE TRIGGER jaad_protect_customer_row_tenant BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.jaad_protect_customer_row_tenant()',tbl);
 END LOOP;
END $triggers$;

-- Preserves existing data and identifiers: no UPDATE/DELETE/TRUNCATE on rows.

-- =====================================================================
-- STAGE 2 INTEGRATION: customer workspaces + trials + subscription rights
-- These statements form part of the SAME transaction as the Stage 2 migration.
-- A company/customer mapping is a trusted tenant identity; a CRM contact is not.
-- =====================================================================

-- The public UI sells four packages. Preserve all four in database validation.
ALTER TABLE public.company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_plan_code_check;
ALTER TABLE public.company_subscriptions ADD CONSTRAINT company_subscriptions_plan_code_check
  CHECK (plan_code IN ('basic','standard','business','premium'));
ALTER TABLE public.billing_payment_attempts DROP CONSTRAINT IF EXISTS billing_payment_attempts_plan_code_check;
ALTER TABLE public.billing_payment_attempts ADD CONSTRAINT billing_payment_attempts_plan_code_check
  CHECK (plan_code IN ('basic','standard','business','premium'));

-- No public/anon/authenticated direct write privileges to workspace bindings.
CREATE TABLE IF NOT EXISTS public.jaad_customer_workspaces (
 company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jaad_customer_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jaad_customer_workspaces FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.jaad_customer_workspaces TO service_role;

-- Database-only provisioning: never assign an unrelated legacy CRM contact to a
-- company. A dedicated customer identity is always created for NEW companies.
CREATE OR REPLACE FUNCTION public.jaad_create_customer_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_customer uuid;
BEGIN
 IF EXISTS (SELECT 1 FROM public.jaad_customer_workspaces WHERE company_id = NEW.id) THEN
   RETURN NEW;
 END IF;
 INSERT INTO public.customers(name, company_name, email, type, user_id,
     company_id, status, subscription_status)
 VALUES (NEW.name, NEW.name,
     (SELECT u.email FROM auth.users u WHERE u.id = NEW.owner_user_id),
     'B2B', NEW.owner_user_id, NEW.id, 'Active', 'inactive')
 RETURNING id INTO v_customer;
 INSERT INTO public.jaad_customer_workspaces(company_id,customer_id)
 VALUES (NEW.id,v_customer);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_create_customer_workspace() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS jaad_create_customer_workspace_trigger ON public.companies;
CREATE TRIGGER jaad_create_customer_workspace_trigger
 AFTER INSERT ON public.companies FOR EACH ROW
 EXECUTE FUNCTION public.jaad_create_customer_workspace();

-- Existing tenant backfill is NON-DESTRUCTIVE: only create a fresh dedicated
-- workspace record if an unambiguous exact (owner,company) customer row does
-- not already exist. Never update IDs, company_id or unrelated customer rows.
DO $backfill$
DECLARE v_company record; v_candidate uuid; v_total integer;
BEGIN
 FOR v_company IN
   SELECT co.id, co.name, co.owner_user_id
   FROM public.companies co
   WHERE EXISTS (SELECT 1 FROM public.company_subscriptions s WHERE s.company_id=co.id)
     AND co.id IS DISTINCT FROM (
       SELECT cfg.crm_company_id FROM public.jaad_platform_config cfg
       WHERE cfg.singleton=true LIMIT 1)
   ORDER BY co.created_at,co.id
 LOOP
   IF EXISTS (SELECT 1 FROM public.jaad_customer_workspaces WHERE company_id=v_company.id) THEN
     CONTINUE;
   END IF;
   SELECT count(*), (array_agg(c.id ORDER BY c.id))[1] INTO v_total, v_candidate
   FROM public.customers c
   WHERE c.company_id=v_company.id AND c.user_id=v_company.owner_user_id
     AND c.status='Active'
     AND NOT EXISTS (SELECT 1 FROM public.jaad_customer_workspaces b WHERE b.customer_id=c.id);
   IF v_total <> 1 THEN
     INSERT INTO public.customers(name,company_name,email,type,user_id,company_id,status,subscription_status)
     VALUES (v_company.name,v_company.name,
       (SELECT u.email FROM auth.users u WHERE u.id=v_company.owner_user_id),
       'B2B',v_company.owner_user_id,v_company.id,'Active','inactive')
     RETURNING id INTO v_candidate;
   END IF;
   INSERT INTO public.jaad_customer_workspaces(company_id,customer_id)
   VALUES(v_company.id,v_candidate);
 END LOOP;
END $backfill$;

-- Customer-company membership is tied to the explicit workspace binding,
-- NEVER to a random user_id-bearing CRM contact row.
CREATE OR REPLACE FUNCTION public.jaad_customer_is_tenant_member(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.jaad_customer_workspaces w
  JOIN public.companies co ON co.id=w.company_id
  JOIN public.customers c ON c.id=w.customer_id
  WHERE w.customer_id=p_tenant AND c.status='Active'
  AND (co.owner_user_id=(SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.customer_team_members m
      WHERE m.customer_id=w.customer_id AND m.user_id=(SELECT auth.uid())
        AND m.status='Active' AND m.accepted_at IS NOT NULL))
 );
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_is_company_member(p_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.jaad_customer_workspaces w
  WHERE w.company_id=p_company
   AND public.jaad_customer_is_tenant_member(w.customer_id)
 );
$$;

-- A trial is valid for exactly the persisted 14-day period. Trialing is
-- server-created on signup, never supplied by the browser. Expired / past_due
-- accounts can still read billing and renew, but SQL data access is denied.
CREATE OR REPLACE FUNCTION public.jaad_customer_plan_allows(p_company uuid,p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.company_subscriptions s
  WHERE s.company_id=p_company
    AND s.status IN ('active','trialing')
    AND s.current_period_end > now()
    AND CASE
      WHEN p_module IN ('inventory','warehouse','invoices','finance','report','reports','hr')
        THEN s.plan_code IN ('business','premium')
      WHEN p_module IN ('clock-tracker','calendar','ai-chat','chat')
        THEN s.plan_code IN ('standard','business','premium')
      WHEN p_module IN ('dashboard','overview','crm','leads','customers','shipments',
         'track','fleet','drivers','support','notes','profile','calculator','utilities')
        THEN s.plan_code IN ('basic','standard','business','premium')
      ELSE false
    END
 );
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_has_tenant_module(p_tenant uuid,p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.jaad_customer_workspaces w
  JOIN public.companies co ON co.id=w.company_id
  JOIN public.customers c ON c.id=w.customer_id
  WHERE w.customer_id=p_tenant AND c.status='Active'
    AND public.jaad_customer_plan_allows(w.company_id,p_module)
    AND (co.owner_user_id=(SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.customer_team_members m
      WHERE m.customer_id=w.customer_id AND m.user_id=(SELECT auth.uid())
        AND m.status='Active' AND m.accepted_at IS NOT NULL
        AND (p_module=ANY(m.permitted_modules)
          OR (p_module IN ('crm','customers') AND 'leads'=ANY(m.permitted_modules))
          OR (p_module='finance' AND 'invoices'=ANY(m.permitted_modules))
          OR (p_module='warehouse' AND 'inventory'=ANY(m.permitted_modules))
          OR (p_module='reports' AND 'report'=ANY(m.permitted_modules)))
    ))
 );
$$;

CREATE OR REPLACE FUNCTION public.jaad_customer_has_company_module(p_company uuid,p_module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.jaad_customer_workspaces w
  WHERE w.company_id=p_company
    AND public.jaad_customer_has_tenant_module(w.customer_id,p_module)
 );
$$;

-- Tenant selection is authorization-only; an inactive subscription is included
-- to allow its OWNER to open renewal checkout, but never operational records.
CREATE OR REPLACE FUNCTION public.jaad_my_customer_tenants()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT w.customer_id FROM public.jaad_customer_workspaces w
 WHERE public.jaad_customer_is_tenant_member(w.customer_id);
$$;

-- Legacy owner-user-id-keyed tables are only safe if the owner has exactly
-- one bound customer tenant. Multiple owners fail CLOSED; do not guess.
CREATE OR REPLACE FUNCTION public.jaad_customer_unique_id_for_owner(p_owner uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN count(*)=1 THEN (array_agg(w.customer_id ORDER BY w.customer_id))[1] ELSE NULL::uuid END
 FROM public.jaad_customer_workspaces w
 JOIN public.companies co ON co.id=w.company_id
 JOIN public.customers c ON c.id=w.customer_id
 WHERE co.owner_user_id=p_owner AND c.status='Active';
$$;

CREATE OR REPLACE FUNCTION public.jaad_unique_customer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN count(*)=1 THEN (array_agg(ten ORDER BY ten))[1] ELSE NULL::uuid END
 FROM (SELECT public.jaad_my_customer_tenants() AS ten) q;
$$;

CREATE OR REPLACE FUNCTION public.customer_has_module(module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.jaad_customer_has_tenant_module(public.jaad_unique_customer_id(),module_key);
$$;

CREATE OR REPLACE FUNCTION public.customer_id_for_active_staff(uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN count(DISTINCT w.customer_id)=1 THEN (array_agg(w.customer_id ORDER BY w.customer_id))[1] ELSE NULL::uuid END
 FROM public.jaad_customer_workspaces w
 JOIN public.customer_team_members m ON m.customer_id=w.customer_id
 WHERE uid=(SELECT auth.uid()) AND m.user_id=uid
   AND m.status='Active' AND m.accepted_at IS NOT NULL;
$$;

-- Old customer registration used to assign every matching NULL-company CRM
-- record to the new business. That is unsafe for legacy contacts. Do not do it.
CREATE OR REPLACE FUNCTION public.jaad_register_business(
 p_user_id uuid,p_business_name text,p_contact_name text,p_phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_company uuid; v_role uuid; v_email text; v_platform_company uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Registration requires trusted server';
 END IF;
 IF length(trim(coalesce(p_business_name,''))) NOT BETWEEN 2 AND 150
    OR length(trim(coalesce(p_contact_name,''))) NOT BETWEEN 2 AND 150 THEN
   RAISE EXCEPTION 'Business name and contact name are required';
 END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=p_user_id;
 IF v_email IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
 SELECT crm_company_id INTO STRICT v_platform_company
 FROM public.jaad_platform_config WHERE singleton=true;
 SELECT id INTO v_role FROM public.roles
 WHERE name='Customer Company Owner' ORDER BY created_at LIMIT 1;
 IF v_role IS NULL THEN RAISE EXCEPTION 'Customer Company Owner role is missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id) THEN
   RAISE EXCEPTION 'Account already has a profile; use existing workspace or support';
 END IF;
 IF EXISTS(SELECT 1 FROM public.customer_team_members WHERE user_id=p_user_id) THEN
   RAISE EXCEPTION 'Invited employees must accept their existing invitation';
 END IF;
 IF EXISTS(SELECT 1 FROM public.companies WHERE owner_user_id=p_user_id) THEN
   RAISE EXCEPTION 'Company already exists for this user';
 END IF;
 INSERT INTO public.companies(name,owner_user_id)
 VALUES(trim(p_business_name),p_user_id) RETURNING id INTO v_company;
 -- Company INSERT triggers atomically create a 14-day Basic trial AND a
 -- dedicated customer tenant record/binding. No second trial may be created.
 INSERT INTO public.profiles(id,full_name,email,phone,company_id,role_id,status)
 VALUES(p_user_id,trim(p_contact_name),v_email,
   nullif(trim(coalesce(p_phone,'')),''),v_company,v_role,'Active');
 INSERT INTO public.leads(company,contact_name,email,phone,source,priority,status,
 company_id,registration_user_id,notes)
 VALUES(trim(p_business_name),trim(p_contact_name),v_email,
   nullif(trim(coalesce(p_phone,'')),''),'Website','Warm','New',
   v_platform_company,p_user_id,
   'JAAD ERP Registration - New business registration. Follow up on onboarding and subscription.')
 ON CONFLICT (registration_user_id) WHERE registration_user_id IS NOT NULL DO NOTHING;
 RETURN v_company;
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_register_business(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaad_register_business(uuid,text,text,text) TO service_role;

-- Keep the customer's original full 14-day trial when they pay early.
-- Verified payments remain idempotent and only service-role callable.
CREATE OR REPLACE FUNCTION public.jaad_activate_subscription_from_payment(
 p_reference text,p_paystack_transaction_id text,p_paid_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_attempt public.billing_payment_attempts%ROWTYPE;
 v_existing public.company_subscriptions%ROWTYPE;
 v_period_start timestamptz; v_period_end timestamptz;
 v_paid_at timestamptz;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Only the verified payment service may activate subscriptions';
 END IF;
 SELECT * INTO v_attempt FROM public.billing_payment_attempts
 WHERE reference=p_reference FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment reference'; END IF;
 IF v_attempt.status='paid' THEN RETURN; END IF;
 IF v_attempt.status<>'pending' THEN RAISE EXCEPTION 'Payment is not pending'; END IF;
 IF p_paystack_transaction_id IS NULL OR length(trim(p_paystack_transaction_id))=0 THEN
   RAISE EXCEPTION 'Missing payment transaction ID';
 END IF;
 IF v_attempt.payment_provider NOT IN ('flutterwave','paystack') THEN
   RAISE EXCEPTION 'Unsupported payment provider';
 END IF;
 v_paid_at:=coalesce(p_paid_at,now());
 SELECT * INTO v_existing FROM public.company_subscriptions
 WHERE company_id=v_attempt.company_id FOR UPDATE;
 IF FOUND AND v_existing.status IN ('active','trialing')
    AND v_existing.current_period_end>v_paid_at THEN
   v_period_start:=v_paid_at;
   v_period_end:=v_existing.current_period_end + INTERVAL '1 month';
 ELSE
   v_period_start:=v_paid_at;
   v_period_end:=v_paid_at + INTERVAL '1 month';
 END IF;
 -- Preserve existing idempotency and payment evidence.
 UPDATE public.billing_payment_attempts SET status='paid',
  flutterwave_transaction_id=CASE WHEN v_attempt.payment_provider='flutterwave'
   THEN p_paystack_transaction_id ELSE flutterwave_transaction_id END,
  paystack_transaction_id=CASE WHEN v_attempt.payment_provider='paystack'
   THEN p_paystack_transaction_id ELSE paystack_transaction_id END,
  paid_at=v_paid_at,failure_message=NULL WHERE id=v_attempt.id;
 INSERT INTO public.company_subscriptions(company_id,plan_code,status,amount_kobo,
   current_period_start,current_period_end,last_payment_reference,updated_at)
 VALUES(v_attempt.company_id,v_attempt.plan_code,'active',v_attempt.amount_kobo,
   v_period_start,v_period_end,v_attempt.reference,now())
 ON CONFLICT(company_id) DO UPDATE SET plan_code=EXCLUDED.plan_code,status='active',
  amount_kobo=EXCLUDED.amount_kobo,current_period_start=EXCLUDED.current_period_start,
  current_period_end=EXCLUDED.current_period_end,
  last_payment_reference=EXCLUDED.last_payment_reference,updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_activate_subscription_from_payment(text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jaad_activate_subscription_from_payment(text,text,timestamptz) TO service_role;

-- profiles.company_id must not grant customer-company data access when the
-- trial/subscription has expired. JAAD internal staff keep their admin company.
CREATE OR REPLACE FUNCTION public.jaad_current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN EXISTS(
    SELECT 1 FROM public.jaad_customer_workspaces w WHERE w.company_id=p.company_id)
   THEN NULL::uuid ELSE p.company_id END
 FROM public.profiles p
 WHERE p.id=(SELECT auth.uid()) AND lower(coalesce(p.status,''))='active'
 LIMIT 1;
$$;

-- Explicitly restrict service-role-only functions; subscription helper
-- may be executed by RLS as authenticated, but never by anonymous visitors.
REVOKE ALL ON FUNCTION public.jaad_customer_plan_allows(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jaad_customer_plan_allows(uuid,text) TO authenticated,service_role;


-- Customer plan-gated module lists: no role may advertise expired/forbidden
-- modules to legacy consumers. All paths use the same authoritative checks.
CREATE OR REPLACE FUNCTION public.customer_permitted_modules()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE(array_agg(m.module_name ORDER BY m.module_name),ARRAY[]::text[])
 FROM unnest(ARRAY[
 'overview','dashboard','inventory','warehouse','leads','crm','customers',
 'shipments','track','invoices','finance','notes','report','reports','support',
 'profile','calculator','utilities','fleet','drivers','hr','calendar',
 'clock-tracker','ai-chat','chat'
 ]::text[]) AS m(module_name)
 WHERE public.jaad_customer_has_tenant_module(public.jaad_unique_customer_id(),m.module_name);
$$;

-- A legacy row keyed only by user_id cannot safely be assigned if that owner
-- has any second customer record; preserve fail-closed behavior.
CREATE OR REPLACE FUNCTION public.jaad_customer_unique_id_for_owner(p_owner uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN count(*)=1 AND
   (SELECT count(*) FROM public.customers cx WHERE cx.user_id=p_owner)=1
   THEN (array_agg(w.customer_id ORDER BY w.customer_id))[1] ELSE NULL::uuid END
 FROM public.jaad_customer_workspaces w
 JOIN public.companies co ON co.id=w.company_id
 JOIN public.customers c ON c.id=w.customer_id
 WHERE co.owner_user_id=p_owner AND c.status='Active';
$$;

-- Customer team management belongs to the actual workspace's company owner,
-- not any CRM-contact row with a matching user_id. Expired plan = no writes.
DROP POLICY IF EXISTS "Owner manages own team" ON public.customer_team_members;
CREATE POLICY "Owner manages own team" ON public.customer_team_members
 FOR ALL TO authenticated USING (
   EXISTS (
     SELECT 1 FROM public.jaad_customer_workspaces w
     JOIN public.companies co ON co.id=w.company_id
     WHERE w.customer_id=customer_team_members.customer_id
       AND co.owner_user_id=(SELECT auth.uid())
       AND public.jaad_customer_plan_allows(w.company_id,'customers')
   )
 ) WITH CHECK (
   EXISTS (
     SELECT 1 FROM public.jaad_customer_workspaces w
     JOIN public.companies co ON co.id=w.company_id
     WHERE w.customer_id=customer_team_members.customer_id
       AND co.owner_user_id=(SELECT auth.uid())
       AND public.jaad_customer_plan_allows(w.company_id,'customers')
   )
 );
REVOKE ALL ON public.customer_team_members FROM anon;

-- Workspace preferences can be read for renewal even when inactive, but
-- operational mutations require an active trial or paid plan.
DROP POLICY IF EXISTS jaad_customer_settings_insert_active ON public.company_workspace_settings;
CREATE POLICY jaad_customer_settings_insert_active
 ON public.company_workspace_settings AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (company_id=public.jaad_current_company_id()
   OR public.jaad_customer_plan_allows(company_id,'dashboard'));
DROP POLICY IF EXISTS jaad_customer_settings_update_active ON public.company_workspace_settings;
CREATE POLICY jaad_customer_settings_update_active
 ON public.company_workspace_settings AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (company_id=public.jaad_current_company_id()
   OR public.jaad_customer_plan_allows(company_id,'dashboard'))
 WITH CHECK (company_id=public.jaad_current_company_id()
   OR public.jaad_customer_plan_allows(company_id,'dashboard'));

-- The profile menu updates only tenant-owned contact/branding fields;
-- financial figures, IDs, subscription status, and ownership remain denied.
GRANT UPDATE (email,currency,tax_rate) ON public.customers TO authenticated;

-- Signup trial is created exactly once by the pre-existing company trigger.
-- This migration deliberately does not reset trial start/end or payment rows.
REVOKE ALL ON FUNCTION public.jaad_initialize_company_subscription() FROM PUBLIC,anon,authenticated;


-- Explicit staff invitation acceptance. Never auto-accept an unrelated
-- membership merely because an email/user ID was inserted into a team row.
-- An invitation is accepted ONLY after the verified recipient clicks Accept.
CREATE OR REPLACE FUNCTION public.jaad_my_pending_customer_invites()
RETURNS TABLE(customer_id uuid,company_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT DISTINCT w.customer_id,co.name
 FROM auth.users u
 JOIN public.customer_team_members m
   ON lower(trim(m.email))=lower(trim(u.email))
 JOIN public.jaad_customer_workspaces w ON w.customer_id=m.customer_id
 JOIN public.companies co ON co.id=w.company_id
 WHERE u.id=(SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL
   AND m.status='Invited' AND m.accepted_at IS NULL
   AND (m.user_id IS NULL OR m.user_id=u.id)
   AND public.jaad_customer_plan_allows(w.company_id,'customers');
$$;
REVOKE ALL ON FUNCTION public.jaad_my_pending_customer_invites() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jaad_my_pending_customer_invites() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.jaad_accept_my_customer_invite(p_customer_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid;v_email text;v_updated integer;
BEGIN
 v_user:=(SELECT auth.uid());
 IF v_user IS NULL THEN RETURN false; END IF;
 SELECT lower(trim(email)) INTO v_email
 FROM auth.users WHERE id=v_user AND email_confirmed_at IS NOT NULL;
 IF v_email IS NULL THEN RETURN false; END IF;
 UPDATE public.customer_team_members m SET
   user_id=v_user,status='Active',accepted_at=now(),
   status_changed_at=now(),status_changed_by='Self (verified invite acceptance)'
 WHERE m.customer_id=p_customer_id AND m.status='Invited'
   AND m.accepted_at IS NULL AND lower(trim(m.email))=v_email
   AND (m.user_id IS NULL OR m.user_id=v_user)
   AND EXISTS (
     SELECT 1 FROM public.jaad_customer_workspaces w
     WHERE w.customer_id=m.customer_id
       AND public.jaad_customer_plan_allows(w.company_id,'customers')
   );
 GET DIAGNOSTICS v_updated=ROW_COUNT;
 RETURN v_updated>0;
END;
$$;
REVOKE ALL ON FUNCTION public.jaad_accept_my_customer_invite(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.jaad_accept_my_customer_invite(uuid) TO authenticated,service_role;

-- Disable the legacy unconstrained multi-invite acceptance function for
-- authenticated users. The new per-workspace function above replaces it.
REVOKE EXECUTE ON FUNCTION public.accept_staff_invite() FROM PUBLIC,anon,authenticated;

COMMIT;
