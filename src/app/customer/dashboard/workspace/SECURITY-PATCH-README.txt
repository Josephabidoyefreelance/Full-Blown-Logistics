JAAD ERP CUSTOMER SERVER ACTION SECURITY PATCH (2026-10-27)

Scope: four customer workspace actions.ts files only. No admin files, SQL or UI modified.

Adds server-side subscription and plan checks to exported Finance, Fleet, Drivers, and HR actions.
HR submitPublicVote is intentionally excluded because it is a public voting endpoint.

IMPORTANT: This is an incremental guard patch, NOT a complete tenant-isolation certification.
The source contains ID-only database updates and inserts without explicit company_id.
Their safety still depends on Supabase RLS. Storage buckets, nested records, RPCs,
all remaining modules, and two-account testing remain to be audited.

Installation: back up originals; extract ZIP into project root preserving src paths.
Then run npm install (if needed) and npm run build locally. Keep tenant mode disabled.
Do not deploy as production-ready until full isolation testing passes.
