-- JAAD DRIVER MANAGEMENT HARDENING
-- Adds proper driver biodata, identity documents, next-of-kin, previous employment,
-- onboarding links and secure document storage without changing the existing UI design.

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS next_of_kin_name text,
  ADD COLUMN IF NOT EXISTS next_of_kin_relationship text,
  ADD COLUMN IF NOT EXISTS next_of_kin_phone text,
  ADD COLUMN IF NOT EXISTS next_of_kin_address text,
  ADD COLUMN IF NOT EXISTS previous_employer text,
  ADD COLUMN IF NOT EXISTS previous_employer_phone text,
  ADD COLUMN IF NOT EXISTS previous_employer_address text,
  ADD COLUMN IF NOT EXISTS previous_employment_start date,
  ADD COLUMN IF NOT EXISTS previous_employment_end date,
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS id_document_path text,
  ADD COLUMN IF NOT EXISTS license_document_path text,
  ADD COLUMN IF NOT EXISTS emergency_notes text;

CREATE TABLE IF NOT EXISTS public.driver_onboarding_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_onboarding_links_token_idx ON public.driver_onboarding_links(token);
CREATE INDEX IF NOT EXISTS driver_onboarding_links_driver_idx ON public.driver_onboarding_links(driver_id);

ALTER TABLE public.driver_onboarding_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jaad_authenticated_driver_links ON public.driver_onboarding_links;
CREATE POLICY jaad_authenticated_driver_links
  ON public.driver_onboarding_links FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Private bucket. Admin/server actions use authenticated storage access; the public onboarding
-- page uses the server-side service role and never exposes the service key to the browser.
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS jaad_authenticated_driver_documents_select ON storage.objects;
DROP POLICY IF EXISTS jaad_authenticated_driver_documents_insert ON storage.objects;
DROP POLICY IF EXISTS jaad_authenticated_driver_documents_update ON storage.objects;
DROP POLICY IF EXISTS jaad_authenticated_driver_documents_delete ON storage.objects;

CREATE POLICY jaad_authenticated_driver_documents_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents');

CREATE POLICY jaad_authenticated_driver_documents_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-documents');

CREATE POLICY jaad_authenticated_driver_documents_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-documents')
  WITH CHECK (bucket_id = 'driver-documents');

CREATE POLICY jaad_authenticated_driver_documents_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'driver-documents');

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_onboarding_links;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
