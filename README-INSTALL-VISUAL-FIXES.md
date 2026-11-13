JAAD LOGISTICS — VISUAL FIX PATCH

This patch makes only the requested presentation changes:
1. Moves homepage global CSS out of a client-rendered <style jsx global> block into src/app/jaad-homepage.css, imported by src/app/layout.tsx. This addresses the unstyled first paint shown in the screenshot by making styles part of the initial stylesheet instead of injecting them after client hydration.
2. Updates the shared PolicyPdfLink modal so every policy document uses a black top banner with the original /public/jaad-logo.png, a document title, and a close button. The “Open PDF in new tab” label/link is removed. The PDF remains inside its own iframe; the document body is not given a black background.
3. Moves the ERP overview “Back to website” button beside the logo in the header and styles it red.

FILES IN THIS PATCH
- src/app/layout.tsx
- src/app/jaad-homepage.css (new)
- src/app/erp/page.tsx
- src/components/homepage/Homepage.tsx
- src/components/PolicyPdfLink.tsx
- public/jaad-logo.png and the homepage assets/policy PDFs included in the archive

SAFE INSTALL
1. Back up your current project files first.
2. Copy the listed files into the matching paths in your project, allowing the new CSS file to be added.
3. Do NOT replace proxy.ts, .env.local, package.json, Supabase/auth files, customer/admin login/signup routes, or database files. This patch does not need changes to those files.
4. Stop the dev server with Ctrl+C, then run `npm run dev` again.
5. Hard-refresh localhost:3000 with Ctrl+Shift+R and test homepage, /erp, and all six footer policy links.

TEST STATUS
The source changes have been inspected for the requested visual behavior, but this patch has not been run inside the user's full local project or browser-tested against their complete repository. If the homepage still shows unstyled content after these styles are loaded statically, check browser DevTools Network/Console for CSS import or build errors.
