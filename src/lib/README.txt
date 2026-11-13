JAAD GLOBAL SUBSCRIPTION PATCH — safe partial fix

1. Back up src/lib/customer-tenant.ts.
2. Replace it with the included file at the same path.
3. Restart Next.js.

Removes hardcoded email billing bypass; ALL tenants now use their own valid company_subscriptions row.
Does NOT unlock the CRM workspace. CRM modules still contain unscoped queries and legacy routes. Do NOT set CUSTOMER_ERP_TENANT_MODE=enabled yet.
No SQL required. No design changes.
