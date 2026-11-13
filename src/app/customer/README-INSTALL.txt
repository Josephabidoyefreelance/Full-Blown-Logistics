JAAD customer ERP — isolated CRM pilot (2026-10-22)

IMPORTANT: This is a working CRM foundation, NOT a complete activation of every copied admin ERP module.
It uses a separate tenant-scoped CRM table and keeps the original admin leads untouched.
It intentionally DOES NOT remove CUSTOMER_ERP_TENANT_MODE safety gate for other modules.

1. BACK UP src/app/customer/dashboard/layout.tsx.
2. Supabase SQL Editor: run supabase/01-tenant-crm.sql. This creates customer_erp_leads and company-scoped RLS policies.
3. Copy the included src/app/customer/dashboard/layout.tsx into your project at that exact path.
4. Copy the folder src/app/customer/dashboard/tenant-crm/ into the matching project folder.
5. Restart npm run dev and sign in as a customer with one active customers record.
6. Click CRM & Leads in customer sidebar. Add a lead and change its status. Refresh to confirm persistence.
7. Verify using TWO distinct customer logins that leads from account A are invisible to account B.

This implementation deliberately keeps other modules locked until their existing shared tables and server actions are tenant-scoped. It does not modify subscription status, customer ownership, or historical CRM data.
If a user owns or belongs to more than one active customer account, this pilot refuses to guess a tenant and displays a safe message.
The included dashboard layout was based on the latest available branding/SQL package; compare with any subsequent local edits before replacing.
The CRM total is shown on its own page; it is NOT yet wired to the main overview dashboard.
