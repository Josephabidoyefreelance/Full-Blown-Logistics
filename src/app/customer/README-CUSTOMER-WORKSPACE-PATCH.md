# JAAD Customer Workspace — Profile, Tenant Branding and Theme Patch

This patch is based on the supplied `customer(4).zip` source. It does not replace the main admin `app/(app)/layout.tsx` or main admin dashboard page.

## Included changes
- Expanded customer profile menu with first name, last name, company/workspace name, business email, phone, business address, currency, tax rate, logo upload, and save action.
- Expanded profile settings page for the same profile fields, logo management, currency, and tax.
- Customer company logo and company name are used in the customer portal sidebar and shipment invoice detail print view.
- Newly created customer-owned invoices default to the tenant's saved logo and use that tenant's configured tax rate (default 7.5%).
- Expanded currency choices and improved dark-theme contrast.
- Kept the existing live clock, notifications, theme toggle, and other tabs/features.

## Installation
1. Back up your project.
2. Copy the files from this archive into the matching paths in your project, preserving the existing `customer/` folder structure.
3. Run `customer/dashboard/customer-profile-company-settings.sql` in the correct Supabase project's SQL Editor.
4. Confirm the Supabase Storage bucket named `logos` exists and its policies allow each authenticated tenant to upload only to its own folder. Do not grant broad write access across tenants.
5. Run your normal TypeScript/build checks and test using a customer-owner account and a staff account.

## Important scope note
The screenshot's `localhost:3000/dashboard` permission warning comes from the separately supplied main admin layout's role/navigation filtering. This archive intentionally does not replace that main admin layout. The admin layout filters `NAV` using `profiles.roles.permitted_modules`; if the role is missing or module keys do not match `NAV`, the sidebar can show only Dashboard. Correct the assigned role/module keys in the admin permissions configuration rather than granting all navigation to an unassigned account. The customer portal patch does not change that separate admin permission record.

## Notes
- Editing the business email here updates the `customers.email` contact field; it does not change the Supabase Auth sign-in email.
- Tax/currency changes apply to newly created customer-owned invoices and features that consume the customer's configured currency/rate. Existing invoices are not retroactively recalculated.
