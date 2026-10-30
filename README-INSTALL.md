# JAAD Logistics — Customer Multi-Tenant ERP Integration Patch

This is an integration patch for the Next.js 16 / React 19 JAAD project, not a standalone complete repository. Merge the included files into the matching locations in the existing project. The admin routes are not replaced.

## Included work

- Replaces the customer dashboard's button-only page with a redirect to a proper ERP workspace overview.
- Keeps the admin-derived module screens under `/customer/dashboard/workspace/*` and rewrites their internal navigation/revalidation paths to customer workspace routes.
- Adds company tenant resolution based on `profiles.company_id`, `companies`, and an active `company_subscriptions` row.
- Adds server-side module entitlements for ₦5,000 / ₦10,000 / ₦15,000 / ₦20,000 packages.
- Makes full CRM-only features (spreadsheet CRM and bulk lead import) require the ₦20,000 Premium plan on the server as well as in the UI.
- Adds company ERP signup at `/customer/erp-signup`, email OTP verification, company workspace provisioning, and initial inactive subscription record.
- Adds company invoice branding settings and a private invoice-logo bucket; customer invoice previews no longer hardcode JAAD's company logo/contact details.
- Adds a Supabase migration for company ownership, tenant `company_id` fields, row-level security, subscription activation RPC, and private invoice/employee/driver document storage policies.
- Updates the subscription page to show four packages and keeps Paystack bank-transfer checkout/verification.

## Package permissions in this patch

| Monthly price | Package | Access summary |
|---:|---|---|
| ₦5,000 | Basic | Dashboard, CRM basic mode, customers, shipments, fleet, drivers, limited support |
| ₦10,000 | Standard | Basic plus clock tracker, calendar and AI assistant |
| ₦15,000 | Business | Standard plus warehouse, finance, HR and reports |
| ₦20,000 | Premium | Business plus full CRM tools |

The ₦15,000 package is set to expanded reporting/support and operational modules in this patch. Confirm the exact commercial feature list before publishing package marketing.

## Merge paths

Copy/merge these into the existing repository root:

- `src/app/customer/**`
- `src/app/(app)/packages/**`
- `src/app/api/billing/**`
- `src/app/api/customer/tenant-provision/route.ts`
- `src/lib/billing/**`
- `src/lib/customer-tenant.ts`
- `src/lib/supabase/**`
- `src/proxy.ts`
- `supabase/migrations/20261017_customer_multitenant_isolation.sql`

The uploaded `package.json`, lockfile, and `tsconfig.json` are the project's reference versions. This patch does not replace those root configuration files or the admin app.

## Critical security steps — do not skip

1. Back up the live Supabase database and run this migration against a staging project first.
2. Review the migration against the actual live schema. It deliberately replaces existing RLS policies on tenant-owned tables and `profiles`; broad permissive policies would defeat isolation, but dropping a policy can also affect existing workflows.
3. Existing rows are **not automatically assigned** to companies. Rows with a null `company_id` remain unavailable to tenant users until an administrator explicitly assigns the correct owner. Do not assign legacy rows to a tenant based only on guesses.
4. The migration creates a tenant-scoped `company_id` and insert trigger for listed operational tables. Validate every table, relationship, RPC, report, and server action in the real database.
5. The existing chat/email attachment flows still contain legacy public-URL/service-role behavior. They need a separate tenant-aware storage migration and signed-URL review before production enablement. Do not enable the tenant mode until this is fixed and tested.
6. Only after the full review passes, set `CUSTOMER_ERP_TENANT_MODE=enabled` in the server environment. Until then, the workspace fails closed instead of exposing potentially global records.
7. Required server variables include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, and `APP_URL`. Never expose service-role or Paystack secret values in browser code or upload `.env.local`.

## Verification checklist before production

- Register Company A and Company B separately, choose different plans, and confirm they receive different `companies.id` values.
- Confirm each owner and each staff profile has the correct `profiles.company_id`.
- Verify active subscription expiry and all four plan permissions server-side.
- Create a lead, customer, shipment, driver, vehicle, warehouse item, invoice, employee, support ticket, and attachment under Company A; sign into Company B and try list, detail, update, delete, export, direct route, and API access. Every Company A record must be invisible and non-editable.
- Confirm the admin can support tenants through authorized admin routes without giving one tenant access to another tenant's records.
- Confirm invoice logos, invoice company details, employee documents, and driver documents are private to the tenant.
- Run `npm run build` and the project's lint/type checks after merging. Those checks have not been run in this patch-generation environment because the full repository and installed dependencies were not provided here.

No GitHub push, merge, or deployment is performed by this patch.
