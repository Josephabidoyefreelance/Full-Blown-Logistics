STAGE 18 — CRM VIEWS AND NAVIGATION

Replace: src/app/customer/dashboard/workspace/crm/page.tsx

Changes:
- Customer CRM tabs stay within /customer/dashboard/workspace/crm.
- Kanban, Sheet, Campaigns and lead import UI are Premium-only.
- Non-Premium requests for advanced views fall back to Leads.
- All tenants use the same plan logic; no hardcoded account.
- No design changes or SQL.

IMPORTANT: This is UI-level gating only. Server actions and APIs must also enforce Premium entitlements. Do NOT enable CUSTOMER_ERP_TENANT_MODE solely on this patch.
Run npm run build after applying.
