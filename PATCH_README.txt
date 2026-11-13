JAAD ERP CRITICAL PATCH — 2026-10-28

This is a PATCH archive, not a full replacement project. Back up your project first.
Extract into the project root, preserving src/... paths. Do not copy env files.

Changes:
- Gmail sync assigns company_id from active profile and scopes duplicate detection.
- Customer portal sends to its one configured company inbox rather than a global support inbox.
- Support email requires an active workspace and escapes HTML.
- Voice SDK saves its Call SID when available and callback prefers parent CallSid.

NOT PRODUCTION CERTIFIED:
- No live two-tenant tests, Twilio/Gmail/Resend delivery tests, or full Next.js build performed.
- Twilio SDK SID may not be populated at the time of saving; test actual calls.
- Other service-role webhook paths and tenant security still require validation.
- The support_inbound_addresses mapping must have exactly one address per company for customer portal sending.
- Sending still uses a global verified EMAIL_FROM; per-company verified sender domains are NOT implemented.
- SQL migration, policy and storage permissions must be checked against the live database.

Do not deploy directly to production without staging verification.
