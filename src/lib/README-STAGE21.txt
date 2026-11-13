JAAD STAGE 21 — SAFE CUSTOMER TENANT RESOLUTION PATCH

SOURCE: JAAD-ERP-FIX1-SOURCE.zip + JAAD-STAGE21(1).zip, inspected 2026-11-02.

This is a targeted security patch, NOT the completed tenant-isolation rollout.
It replaces exactly one source file: src/lib/customer-tenant.ts

INSTALL (Windows PowerShell):
1. Back up your existing src/lib/customer-tenant.ts.
2. Extract ZIP and copy its src/lib/customer-tenant.ts to the same relative path in jaad-backend.
3. Keep CUSTOMER_ERP_TENANT_MODE disabled (or unset).
4. Run npm run build in jaad-backend.

WHAT CHANGED:
- Does not trust profiles.company_id alone as customer workspace ownership.
- Requires explicit active customer owner or accepted active team membership.
- Requires a linked company matching the current profile-based restrictive RLS guard.
- Rejects ambiguous multiple matching tenants; no arbitrary first-row selection.
- Preserves subscription checks, module checks and existing admin UI.

IMPORTANT LIMITATIONS:
- The two customer rows with NULL company_id remain blocked; do NOT auto-map them.
- Cross-company staff access requires a later portal-specific RLS redesign.
- This patch does not activate modules, migrate records, or verify Supabase live access.
- Do not enable CUSTOMER_ERP_TENANT_MODE yet; API routes, storage and cross-tenant tests remain outstanding.
