# JAAD Customer ERP workspace

The customer ERP workspace lives at `/customer/dashboard/workspace`. The root `/customer/dashboard` route preserves the existing shipment-customer portal for accounts that are not linked to a company; users whose `profiles.company_id` is set are sent to the ERP workspace.

The workspace mirrors the admin module screens while keeping admin-only routes out of the customer navigation. Access is based on `profiles.company_id`, the matching `companies` row, and an active `company_subscriptions` record. Row-level security is provided by `supabase/migrations/20261017_customer_multitenant_isolation.sql`.

**Safety gate:** `CUSTOMER_ERP_TENANT_MODE` must remain unset until the migration is reviewed against the live database, tenant data and relationship policies are verified, and legacy chat/email attachment storage has been converted to company-scoped private paths with signed URLs. Do not set it to `enabled` just to bypass the setup screen.

See `/README-INSTALL.md` in the integration patch for merge steps, package permissions, and the tenant isolation test checklist.
