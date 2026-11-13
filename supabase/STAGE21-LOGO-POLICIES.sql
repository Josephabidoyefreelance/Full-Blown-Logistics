-- Stage 21: logo-write policy consolidation. Execute only after reviewing the preview below.
-- Keeps existing objects and public read access unchanged. No customer/company IDs are hardcoded.
-- Run in Supabase SQL Editor as a privileged database administrator.
BEGIN;
DROP POLICY IF EXISTS "Tenant owners delete their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Tenant owners update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Tenant owners upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "jaad_company_member_logo_insert" ON storage.objects;
DROP POLICY IF EXISTS "jaad_company_member_logo_update" ON storage.objects;
DROP POLICY IF EXISTS "jaad_company_owner_logo_insert" ON storage.objects;
DROP POLICY IF EXISTS "jaad_company_owner_logo_update" ON storage.objects;
DROP POLICY IF EXISTS "jaad_logo_tenant_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "jaad_logo_tenant_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "jaad_logo_tenant_owner_update" ON storage.objects;
-- Customer workspace owner: path begins with customers.id and customer is linked to a company.
CREATE POLICY "stage21_logo_customer_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.customers c WHERE c.id::text = (storage.foldername(name))[1]
 AND c.user_id = (SELECT auth.uid()) AND c.company_id IS NOT NULL));
CREATE POLICY "stage21_logo_customer_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.customers c WHERE c.id::text = (storage.foldername(name))[1]
 AND c.user_id = (SELECT auth.uid()) AND c.company_id IS NOT NULL))
WITH CHECK (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.customers c WHERE c.id::text = (storage.foldername(name))[1]
 AND c.user_id = (SELECT auth.uid()) AND c.company_id IS NOT NULL));
CREATE POLICY "stage21_logo_customer_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.customers c WHERE c.id::text = (storage.foldername(name))[1]
 AND c.user_id = (SELECT auth.uid()) AND c.company_id IS NOT NULL));
-- Admin-owned company branding: path begins with companies.id; do not grant access
-- merely because profiles.company_id matches.
CREATE POLICY "stage21_logo_company_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.companies co WHERE co.id::text = (storage.foldername(name))[1]
 AND co.owner_user_id = (SELECT auth.uid())));
CREATE POLICY "stage21_logo_company_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.companies co WHERE co.id::text = (storage.foldername(name))[1]
 AND co.owner_user_id = (SELECT auth.uid())))
WITH CHECK (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.companies co WHERE co.id::text = (storage.foldername(name))[1]
 AND co.owner_user_id = (SELECT auth.uid())));
CREATE POLICY "stage21_logo_company_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND EXISTS (
 SELECT 1 FROM public.companies co WHERE co.id::text = (storage.foldername(name))[1]
 AND co.owner_user_id = (SELECT auth.uid())));
COMMIT;
