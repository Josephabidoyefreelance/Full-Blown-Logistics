LEVEL 8 STAGES 1 AND 2 — REVIEW PATCH (NOT DEPLOYED)
Stage 1: All four inbound email endpoints require an explicit unique registered destination-to-company mapping before inserting support_emails. Unmapped emails return 422; a mapping table failure returns 503. Review your provider's retry behavior and route unmapped mail to a safe quarantine before enabling live traffic. Existing support_emails rows are not modified.
Stage 2: company workspace PATCH is owner-only; GET remains unchanged. Non-owner logo updates will be rejected with 403. Confirm that this role policy matches your requirements.

REQUIRED BEFORE DEPLOYMENT:
1. Review SQL against your actual Supabase schema (companies.id/support_emails.company_id must be UUID).
2. Apply reviewed migration, add a verified inbound address mapping for every tenant expecting mail, and establish quarantine for unknown recipients.
3. Verify support_emails RLS for SELECT/UPDATE/DELETE; service-role inserts bypass RLS.
4. Test real webhook signatures, duplicates, mapping and cross-tenant isolation, then run tsc/build.
5. Back up existing source files before copying patch files to the same relative paths.
This patch has not been tested against your live database or deployed.
