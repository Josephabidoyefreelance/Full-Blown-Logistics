JAAD targeted fixes — 22 October 2026

1) DASHBOARD BANNER
The included page.tsx is based on the previously uploaded JAAD-Customer-Dashboard-CORRECTED.zip. It removes ONLY the yellow dashboard-design-preview message, leaving the Company settings / logo button. Install to src/app/customer/dashboard/page.tsx ONLY if this is still your active page version. Otherwise search your current file for the exact text "Dashboard design preview — operational totals are hidden until tenant security is verified." and remove the containing warning banner, preserving <CustomerCompanySettings />.
Removing the message does NOT activate operational counts or prove tenant security.

2) LOGO UPLOAD
The screenshot's exact "Profile & workspace" component was found in your previously uploaded profile-menu.tsx. The included replacement validates PNG/JPEG/WebP and uses a unique file path under the company ID without upsert. Replace the matching existing profile-menu.tsx at its current project location (do not put it in an invented folder).
Run supabase/active-company-member-logo.sql in Supabase SQL Editor. This adds INSERT authorization for active members of that company, using company-ID folders. Existing owner policies stay as-is.
The file path is `${customerId}/${Date.now()}.${extension}`. SQL authorizes only active members of that customer_id. Test uploading a NEW PNG/JPG/WebP under 3 MB.

IMPORTANT: Storage INSERT permission and customers table UPDATE permission are separate. If upload succeeds but Save changes fails, the customers RLS UPDATE policy needs examination; do not grant blanket UPDATE. If SQL fails, share the exact error. This package was statically inspected, not run against your Supabase deployment.
