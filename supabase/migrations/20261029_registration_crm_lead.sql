-- Non-destructive deduplication protection. Do not create tenant records for unknown auth users.
-- Check for existing duplicates before running this migration.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.leads WHERE registration_user_id IS NOT NULL GROUP BY registration_user_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate registration_user_id values exist; resolve before migration';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS leads_registration_user_id_unique
  ON public.leads (registration_user_id)
  WHERE registration_user_id IS NOT NULL;
