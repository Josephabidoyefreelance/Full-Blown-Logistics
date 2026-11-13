JAAD STAGE 11 - TENANT-SCOPED READ PAGES

Replace these files at the exact paths in the ZIP:
- src/app/customer/dashboard/workspace/customers/page.tsx
- src/app/customer/dashboard/workspace/crm/page.tsx

Both pages now require an authenticated, active subscribed tenant and explicitly filter customer, lead, and staff reads by company_id. Lead notes are limited to IDs of leads returned for that company. UI markup is unchanged.

IMPORTANT: This is NOT a complete CRM unlock. Mutations, child components, API routes and other workspace modules still require a security review. Keep CUSTOMER_ERP_TENANT_MODE disabled. This patch is based on src(4).zip; if you have subsequently edited these two files, compare before overwriting. No SQL needed.
