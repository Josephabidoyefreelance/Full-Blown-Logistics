# JAAD Logistics — final corrections

This source patch updates the existing redesigned homepage/ERP source package.

## Changes
- Removed the ERP/CRM pricing pitch section (“Explore plans for your operation”, the explanatory sentence, and “Ask about pricing”).
- Kept “Back to website” outside and above the ERP/CRM header.
- Kept the admin-login destination as a visually hidden, tiny access link directly underneath Careers in the Company footer list; it is not shown as a visible Admin Login label.
- Updated the shared JAAD logo asset using the logo supplied by the user.
- Legal-policy popup retains the black header and JAAD logo, and now shows a white loading surface with “Loading document…” until the PDF iframe fires its load event.
- The six legal PDFs remain included in `public/documents/`.

## Verification limits
Automated source assertions passed for these changes and the archive was checked for required files. This package does not include the full application `package.json`, installed dependencies, environment, or a running browser, so a full Next.js build and real browser/PDF rendering test could not be performed here. Do not treat this as a production-tested release.

## Install
Back up the corresponding files in your project, then copy the included `src/` and `public/` contents into the matching project paths. Do not replace environment files or unrelated authentication/backend code.
