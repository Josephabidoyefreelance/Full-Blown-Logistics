# JAAD customer tenant branding and registration fix

This patch targets the customer/multi-tenant routes only. It does not replace `src/app/(app)/layout.tsx` (the admin layout).

## Files
- `app/customer/dashboard/layout.tsx` — customer sidebar uses a light background in light mode, preserves red accents, shows the company name/logo from the customer's tenant record, and removes the Administration link.
- `app/customer/signup/page.tsx` — same signup design; reports a clear error instead of silently continuing when the customers tenant row is blocked.
- `supabase/customer-tenant-logo-rls.sql` — additive RLS policies for a user to create/read/update their own `customers` row and upload logos only under their own user-id folder.

## Install
1. Back up your current customer files.
2. Copy the two TSX files to `src/app/customer/dashboard/layout.tsx` and `src/app/customer/signup/page.tsx` respectively. If your project keeps routes directly under `app/`, use the matching `app/customer/...` paths instead.
3. In Supabase SQL Editor, review and run `customer-tenant-logo-rls.sql`. Confirm a Storage bucket named `logos` exists. Do not run this in the wrong Supabase project.
4. Test with a fresh test email at `/customer/signup`, then sign in at `/customer/login` and open `/customer/dashboard`.

## Important
- This SQL only authorizes each authenticated user to manage their own `customers` row and logo folder. It does not grant admin access.
- If your schema has additional mandatory `customers` columns, signup may still need those fields added.
- A newly registered tenant should now have a `customers` row with `user_id = auth.uid()`. The sidebar reads `name` and `logo_url` from that row. Existing accounts that have no customer row need a tenant record linked to their auth user before logo upload can work.
- The customer sidebar's light-mode background was changed because the reported issue was the black left panel. Dark mode remains dark; red accents and the rest of the page design are preserved.
