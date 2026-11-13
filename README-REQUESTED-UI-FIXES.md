JAAD LOGISTICS — REQUESTED UI FIXES

Included source changes:
- ERP overview Back to website button remains above/outside the header.
- ERP header navigation labels are uppercase and bold.
- Customer Login appears before Contact Sales.
- Footer Admin access remains an empty, visually hidden link directly after Careers; there is no visible Admin Login label. This is a UI concealment only, not a security feature. Keep /admin/login protected by authentication/authorization.
- Legal policy modal styling uses a black branded header and a clean white document stage with a loading overlay. The browser's built-in PDF viewer may still display its own toolbar depending on browser behavior; suppressing that toolbar reliably requires a PDF.js-based viewer or converting PDFs for in-app rendering.

IMPORTANT LIMITATION
This source package does not contain the actual /customer/login page component, so it cannot place the ERP & LEADS button beside the Back to website button on that page. That page needs to be included to make that exact change safely. This package also is not the full application and has not been run in your local Next.js environment.

Apply only the included source files to your existing project after backing them up. Do not replace environment, auth, Supabase, or other application files with this package. No GitHub push or deployment was performed.


LATEST REQUESTED CHANGE
- Added a responsive four-tier ERP pricing presentation: Starter ₦5,000/month, Growth ₦10,000/month, Professional ₦15,000/month, and Business ₦20,000/month.
- Pricing calls to action link to the existing customer signup route. This is a presentation-layer change only; it does not change payment processing, subscription records, or backend entitlement enforcement.
- Homepage admin route remains a visually hidden link after Careers in the footer.
- Existing hero copy and Back to website placement were left intact.
