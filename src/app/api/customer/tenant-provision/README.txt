JAAD Stage 1: Safe trial fix and read-only account check

1. New signup 14-day Premium trial (for new registrations only):
   Back up and replace:
   src/app/api/customer/tenant-provision/route.ts
   This file is unchanged from the earlier trial patch; if already installed, do not replace again.

2. In Supabase SQL Editor run 01_CHECK_CUSTOMER_ACCOUNT.sql.
   It reads the exact Outlook test account, profile, company owner and subscription,
   plus the customer portal record. It DOES NOT modify any database record.
   Send the result (no tokens/passwords). This is necessary before granting
   permanent access or correcting the account-company mismatch.

3. DO NOT enable CUSTOMER_ERP_TENANT_MODE yet. The copied ERP pages have
   unscoped legacy queries; disabling the safety lock would expose tenant data.

No login, logo, dashboard or Role & Access file is changed.
