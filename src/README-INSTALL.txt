JAAD ERP — LAST-MINUTE PROFILE, TENANT BRANDING, NAVIGATION AND SCROLL FIX

WHAT THIS PATCH DOES
- Replaces the small question-mark/avatar popover with a larger Profile & Workspace modal.
- Includes first name, last name, email, phone, company name, business address, logo upload, currency, and tax rate (default 7.5%).
- Saves personal details to public.profiles and workspace settings to the tenant's public.customers row.
- Uses the tenant's saved logo and company name in the sidebar.
- Restores the live clock in the top bar.
- Makes the sidebar and main page independently scrollable.
- If the role or module keys do not match any navigation items, displays the navigation as a recovery fallback. This is NOT authorization; protected pages/actions must enforce access themselves.

BACK UP FIRST
Copy your current files somewhere safe before replacing anything.

COPY THESE FILES TO YOUR PROJECT
1. components/profile-menu.tsx  -> your project's components/profile-menu.tsx
2. components/nav-menu.tsx      -> your project's components/nav-menu.tsx
3. components/live-clock.tsx    -> your project's components/live-clock.tsx
4. app-layout.tsx               -> replace the existing app/(app)/layout.tsx (or the layout file that currently imports ProfileMenu and NavMenu).

IMPORTANT: app-layout.tsx is supplied under that temporary filename because ZIP extraction can be awkward with parentheses. Rename it to layout.tsx in the correct existing route folder. Do not create a second layout at a new route.

DATABASE
Run sql/profile-workspace-settings.sql in the SQL Editor for the SAME Supabase project used by localhost. It only adds columns and a logos bucket/policies; it does not drop tables or remove existing policies. Read the SQL before running it. If Supabase reports a column/table/policy error, stop and send the exact error instead of trying random SQL.

STORAGE / LOGO
The patch uses a Supabase Storage bucket named `logos`. The migration creates it as public-read so logos can display in the sidebar and printed documents. Upload/update/delete is restricted to an authenticated owner of the tenant row, with the object path starting with that tenant's customer UUID. Staff membership upload support is not enabled by this migration.

AFTER INSTALLING
1. Restart the dev server if the layout/component changes do not hot-reload.
2. Sign in and click the red profile/avatar button at the top-right.
3. Fill out the profile/workspace fields and click Save changes.
4. Confirm company name/logo in the sidebar and test navigation and scroll.
5. Confirm role/module permissions in the database. The UI fallback does not grant data access.

LIMITATIONS TO UNDERSTAND
- Editing the profile email here updates the profile/contact email field; it does NOT change the Supabase Auth login email. Password reset is sent through Supabase Auth.
- Currency/tax values are saved to the tenant's customers row. Other modules/invoice generators must read these fields to apply them throughout the system. Existing invoices are not recalculated automatically.
- The layout tries to resolve a tenant through customers.user_id or customer_team_members.member_user_id. If your actual schema uses different column names, send the exact schema/error and do not run destructive changes.
- I cannot verify your live localhost instance from this patch alone; run your project's TypeScript/build checks and test with both a tenant owner and staff account.
