# JAAD public ERP + PDF modal patch

- `/erp` and `/documents/*` are explicitly public in the replacement `proxy.ts`, so they do not get redirected to login.
- Footer legal items open a modal containing the matching PDF on both the homepage and ERP overview. Close with ×, click outside, or press Escape.
- Includes the six supplied legal PDFs under stable names in `public/documents/`.
- Customer login and Admin login remain separate from the public ERP overview.

## Install
1. Back up matching source files.
2. Merge the included `src/` and `public/` folders into the existing project.
3. Replace the current `proxy.ts` at the same location as the existing proxy file.
4. Do not replace `.env.local`, Supabase keys, database migrations, or auth pages.
5. Restart `npm run dev`.

This patch is built from the available homepage source archive, not the complete application. A full-app build and browser test cannot be certified here. Verify `/erp` and the PDF modal after merging.


## This revision
- PDF modal header now uses the original `/jaad-logo.png` asset on a black banner. The extra “Open PDF in new tab” label is removed and the embedded PDF toolbar is hidden. The modal close button remains.
- Added a “Back to website” button above the ERP overview navigation.
- Login/signup white-border and homepage first-load glitch are not changed by this patch because the complete current login/signup and global layout/style source files were not present in the supplied homepage archive. Those need to be patched against the exact current files rather than guessed. Cloudflare settings are intentionally untouched.
