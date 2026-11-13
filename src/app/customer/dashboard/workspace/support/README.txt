JAAD STAGE 20 — REVIEW CANDIDATE, NOT PRODUCTION-APPROVED

Source: app(7).zip, app/customer/dashboard/workspace/support/actions.ts
Target in your Next.js project: src/app/customer/dashboard/workspace/support/actions.ts

Changes:
- Adds tenant/subscription presence check and server-side module permission RPC to 19 exported actions.
- Adds explicit company_id matching to several support record updates.
- Blocks chat file uploads until Stage 21 private-file authorization is implemented. This intentionally affects attachment functionality.

Limitations requiring additional work BEFORE DEPLOYMENT:
- Existing support message insert and read flows still rely on RLS and triggers; no JWT cross-tenant tests run.
- Team-chat private-recipient permissions are not enforced by this patch.
- Plan-specific support entitlements are not independently checked because billing/plans.ts was absent from the archive.
- Email HTML sanitization, external recipient validation, attachment constraints, and KB article permissions still require review.
- Customer tenant context uses primary profiles.company_id and does not support multi-company workspace selection.
- Build/type-check and integration tests have NOT been run.

Do not deploy to production as-is. Back up the original before testing on a staging branch.
