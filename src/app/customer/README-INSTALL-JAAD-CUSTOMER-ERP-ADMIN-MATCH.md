# JAAD Customer ERP — Admin-matched shell, Phase 1

## Install
Back up the existing customer dashboard files first. Copy these files to the matching paths in the project:
- `app/customer/dashboard/layout.tsx`
- `app/customer/dashboard/page.tsx`
- `app/customer/dashboard/customer-sign-out-button.tsx`

These replace the previous customer dashboard shell. Do not copy the `(app)/layout.tsx` file over the customer route or replace the admin layout.

## What follows the uploaded admin layout
- Same 64-unit (w-64) black sidebar.
- Same red scrollbar treatment.
- Same dark/light neutral palette and compact navigation density.
- Same compact top bar pattern with sound, theme and profile controls.
- Main content padding follows the admin layout's responsive spacing pattern.
- No logo image is displayed or hard-coded in the customer portal.
- Customer modules are listed in a left sidebar and the dashboard.

## Tenant branding and invoices
This phase intentionally does not add a shared JAAD logo. Customer-specific company branding should be implemented as a later company settings feature, with a company-owned logo uploaded and stored against that company. Invoice templates should read the active company's branding settings and never use another tenant's logo. No database schema or Supabase upload policies are added in this UI-only phase.

## Safety / integration scope
The supplied `(app)(7).zip` contains application-route files but not the project root, shared components, Supabase client/server helpers, schema/migrations, or `lib/nav.ts`. This package reuses existing imports from the project and cannot be built in isolation here.
- Module navigation currently opens a module-specific workspace panel on the dashboard, not admin module routes.
- Real tenant-specific module operations are not added in this phase.
- Notifications are not queried in this customer layout because the supplied admin query does not show a company-scoping filter. Reusing it without confirming its RLS policy could disclose another company's notices.
- Before module activation, verify company-scoped RLS, server-side authorization, subscription entitlements, and cross-company access denial.

## Verify after copying
1. Run `npm run build`.
2. Open `/customer/dashboard` and check the left sidebar, top header, page padding, responsive width and dark mode.
3. Test login/logout and each sidebar link.
4. Confirm the admin `/dashboard` and `/admin` pages remain unchanged.
5. Do not enable tenant modules until their Supabase access is reviewed and tested.
