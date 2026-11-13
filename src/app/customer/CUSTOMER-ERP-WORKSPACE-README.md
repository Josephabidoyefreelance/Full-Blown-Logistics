# JAAD Customer Dashboard — ERP Workspace Port

This archive is based on the uploaded `customer(3).zip` and adds a customer ERP workspace using the uploaded `(app).zip` as the source for module UI and components.

## What changed
- Preserved the existing customer portal and its current tabs/features.
- Added an **Open Full ERP Workspace** button in the customer portal sidebar.
- Added `/customer/dashboard/workspace` with navigation for:
  - Shipments
  - Customers
  - Drivers
  - Fleet
  - Warehouse
  - Finance
  - HR
  - CRM & Leads
  - Support
  - Reports
  - Calendar
  - Clock Tracker
  - AI Chat
- Copied each module's page and companion components/actions into `customer/dashboard/workspace/<module>/`.
- Rewrote common internal links/revalidation paths to the customer workspace where possible.
- Did **not** copy the admin-only `/admin` module.
- Did **not** copy the `/packages` module, per instruction.

## Important safety gate
The copied admin pages were built for the admin's global data view. The uploaded module pages do not consistently filter their database queries by a customer/tenant ID. Enabling them without tenant-level isolation could expose another business's records.

For that reason, `customer/dashboard/workspace/layout.tsx` fails closed unless this environment variable is set:

`CUSTOMER_ERP_TENANT_MODE=enabled`

**Do not set this variable yet.** First scope every module query and mutation to the signed-in customer's tenant and verify Supabase RLS policies. The gate is intentionally present so this port does not accidentally expose global admin data to customer accounts. When tenant isolation is complete, the gate can be enabled and tested.

## Install
1. Make a backup of your current project.
2. Extract this ZIP.
3. Copy/merge the included `customer/` folder into your project's existing `customer/` folder, preserving other project files.
4. Restart the dev server (`npm run dev`).

This archive does not include or replace the admin dashboard, global middleware/proxy, project dependencies, or Supabase migrations. It is a customer-only ZIP.
