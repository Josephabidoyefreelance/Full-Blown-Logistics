# JAAD ERP — Signup Password Fields Only

Scope: **only** `src/app/customer/signup/page.tsx`.

Adds **Enter password** and **Enter password again** below Phone number, using the page's existing field styling. Validates at least 8 characters and exact confirmation **before sending the existing email OTP**. After email OTP verification establishes an authenticated session, calls Supabase `auth.updateUser({ password })` before the existing workspace registration call. Does not send the password to the workspace API or write it to localStorage.

**Unchanged:** signup logo, page layout/styles, phone, email code verification, registration API, 14-day trial, pricing, login page, RLS, tenant isolation and all other files.

## Recommended installation (only one source file changed)
1. Back up your working project.
2. Extract this ZIP.
3. From PowerShell in your JAAD project folder, run:

   node "C:\\PATH\\TO\\EXTRACTED\\JAAD-SIGNUP-PASSWORD-ONLY\\INSTALL-SIGNUP-PASSWORD.js" "C:\\Users\\DELL\\Desktop\\VS Code 2\\Full Blown Logistics\\jaad-backend"

   The script checks that the active signup file matches the relevant anchors before writing. It automatically creates a `.bak` backup and never overwrites unrecognized code.
4. Run `npm run build`. Test a **new test signup**: password mismatch must block Send Code; matching password should allow normal email verification and company provisioning.

## Important limitations
- Existing accounts created via email-code OTP **do not retroactively acquire a password**. Do not assume their test credentials work with `signInWithPassword()`.
- Your **customer login page remains email OTP-only**, by your request. Adding a password at signup does not introduce a password-login button. That would be a **separate**, explicitly approved change.
- This package **does not unlock ERP modules or prove tenant isolation**.
- A password stored in the JS component state is used only to call `supabase.auth.updateUser()` after OTP verification. Never include passwords in test logs or chat messages.
- The `auth.updateUser()` call may be affected by Supabase password policy settings; test in staging with a new test account before production rollout.

## Alternative
The complete patched file is included at `src/app/customer/signup/page.tsx`, but **do not replace an actively modified signup page with it without comparing changes**. Prefer the guarded installer.
