JAAD LOGISTICS HOMEPAGE REDESIGN

Files
- page.tsx: redesigned public homepage component

Install
1. Back up the existing file at src/app/page.tsx.
2. Replace src/app/page.tsx with this page.tsx.
3. Keep the existing supporting routes and assets, especially /logo.png,
   /customer/login, /customer/signup, and /admin/login.
4. Run npm run build locally before committing or pushing any changes.
5. Review the pricing text against the actual package configuration before publishing.

Preserved existing behavior
- Customer login and signup links
- Admin login link
- WhatsApp contact link and popup behavior
- Legal document content and modal access
- Monthly pricing card structure

Changes
- Clearer page hierarchy and responsive navigation
- Dark hero with illustrative dashboard preview
- Organized ERP module cards, benefits, onboarding steps, pricing, and CTA
- Legal documents grouped into Company & agreements, Privacy & data, and Customer care
- Legal viewer restyled for easier reading and scrolling

Important
The dashboard preview uses illustrative figures. They are visual examples, not live account data.
The old public homepage listed Starter/Growth/Business. This redesign uses Basic/Standard/Premium
so the labels match the names used by the subscription integration. Shipment quotas and
feature claims are retained from the provided homepage and must be confirmed to match the
actual server-side subscription limits before treating them as enforced entitlements.

This is a source file package only. It has not been installed in the user's repository,
committed, pushed, or deployed.
