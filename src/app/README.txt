STAGE 1 - Registration foundation ONLY (not full Stage 1)

Replace only: src/app/api/customer/tenant-provision/route.ts
Back up the original first. Do not enable CUSTOMER_ERP_TENANT_MODE yet.

What this patch does:
- Creates a separate company for a newly verified user.
- Creates a 14-day trial record (trialing, 0 kobo, dates).
- Links the user's profile and customer record to the company.
- Does not alter existing linked demo/admin accounts.
- Refuses ambiguous existing records rather than guessing.

Prerequisite: database constraints already allow trialing and zero amount.

NOT YET IMPLEMENTED: trial entitlement enforcement, customer login compatibility,
manual payment approval, customer workspace RLS audit, or full end-to-end tests.
This route performs several database writes, not a single atomic transaction.
Test on a staging database with a new signup before deploying to production.
