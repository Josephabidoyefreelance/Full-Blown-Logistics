JAAD customer authentication contrast patch

Files:
- customer-login-page.tsx: customer sign-in page
- customer-signup-page.tsx: customer account registration page
- customer-erp-signup-page.tsx: company ERP workspace registration page

What changed:
- The "Back to website" link on customer login and signup now uses an explicit light background, dark text, and visible border so it stays readable even if a global CSS rule overrides Tailwind text colors.
- The Home link on the ERP workspace signup page now has an explicit readable light text color.

No authentication logic, Supabase calls, routes, form fields, dashboard styles, or database settings were changed.

How to apply:
1. Back up the current files.
2. Replace the matching page source files in your project with the corresponding patched files.
3. Keep each file at its existing route/path; do not rename the page files inside your project.
4. Restart the Next.js dev server and check /customer/login and /customer/signup.

The uploaded files did not include their original folder paths, so map each replacement by matching its component/content to the existing page in your project.
