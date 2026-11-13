JAAD FOOTER / ADMIN ACCESS UPDATE

This package updates the Company section on the public homepage and ERP overview.

Changes:
- Renames About JAAD to About Us.
- Adds Careers linking to /careers.
- Replaces the visible Admin login label with a discreet Admin access link in the footer.
- Keeps the admin route at /admin/login and leaves the ERP header without an Admin Login button.

Install safely:
1. Back up your project first.
2. Copy the included files into the matching paths in your project, preserving the directory structure.
3. Do not replace .env.local, proxy.ts, package.json, Supabase, or authentication files.
4. Restart npm run dev and test /, /erp, and /admin/login.

Note: Hiding a link is not security. Keep server-side authentication and admin-role authorization enabled.
The /careers route must exist separately; this package adds the link but does not create a Careers page.
This source package has not been run in your complete local environment.
