JAAD ERP — Finance subscription review (stage 1)

WHAT THIS PATCH DOES
- Adds a Subscriptions tab to the existing JAAD Finance navigation.
- Displays existing company subscriptions and recent payment attempts to verified JAAD Super Admin accounts only.
- Keeps all existing Finance tabs, JSX and spacing intact except the single added tab and component.
- Does NOT activate accounts or alter the database.

INSTALL
1. Back up your existing src/app/(app)/finance/page.tsx.
2. Copy the two files from this patch into the same project paths.
3. Run npm run build and inspect /finance?view=subscriptions while logged in as a JAAD Super Admin.
4. If your production database lacks any queried column/table, the tab will display a database error instead of changing records.

CRITICAL SECURITY FINDINGS FROM THE UPLOADS
- Two conflicting entitlement maps: src/lib/billing/plans.ts and src/app/customer/dashboard/workspace/subscription-entitlements.ts. Reconcile before activation.
- src/lib/customer-tenant.ts uses companies + profiles.company_id, but the tested customer account uses customers.user_id with customers.company_id NULL.
- CUSTOMER_ERP_TENANT_MODE gates the helper, and the presence of the helper alone does not prove every page/API uses it.
- Paystack webhook currently invokes verifyAndActivateBankTransfer on charge.success; it is not manual approval only. Must change before claiming manual activation.
- Uploaded Supabase migrations are not a verified snapshot of the live billing schema.
- No legal-record export is enabled by this patch. It requires formal approval, narrowly scoped retrieval, audit logging and legal review.

DO NOT ENABLE PAID CUSTOMERS UNTIL RLS, activation and subscription enforcement are tested end to end with separate accounts.
