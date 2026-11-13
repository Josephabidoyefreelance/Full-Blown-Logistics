# JAAD ERP — Multi-tenant structure

## Purpose
This reserves `/erp` for the customer-facing multi-tenant ERP while preserving the existing JAAD ERP interface, red/black branding, logo, typography, spacing, and business workflows. It is not a redesign.

**Scope warning:** this is a structure/implementation blueprint, not an activated multi-tenant system. The supplied ZIP contains `(app)` route-group files, but not the full project root, Supabase schema/migrations, `lib/` implementation, environment configuration, or lockfile. Tenant isolation must not be enabled until the actual schema and every affected server action have been audited and migrated.

## Intended route layout
- `/erp` — resolve the signed-in user's company and open its workspace.
- `/erp/companies` — company onboarding/profile, permission-gated.
- `/erp/workspace` — customer workspace shell using the existing JAAD ERP layout.
- Existing modules (CRM, customers, fleet, finance, HR, warehouse, support, shipments, reports, calendar, clock tracker) remain the source of truth for UI/workflows. Do not fork them into a visually different customer app.

These route folders are a target architecture. Wire them only after shared module pages/components and tenant-aware server actions have been safely extracted from the current routes.

## Tenant security rules
1. Resolve `company_id` from the authenticated server-side membership record. Never trust a company ID supplied by a browser form, query string, route parameter, or local storage.
2. Every company-owned table needs a tenant ownership key and appropriate foreign keys/indexes.
3. Enable and test RLS on every tenant-owned table, view, storage bucket, and relevant RPC/function.
4. Apply SELECT/INSERT/UPDATE/DELETE policies as appropriate; updates must not permit moving a record to another company.
5. Every server action/API route must authenticate, authorize, and constrain database operations to the active company.
6. Keep platform Super Admin access separate from customer-company administration. A company admin must not become a platform Super Admin.
7. Preserve existing records. Do not blanket-backfill `company_id` or enable enforcement until existing records are mapped to the correct company and verified.
8. Keep Supabase service-role credentials server-only. Do not bypass RLS to make customer pages work.
9. Add tenant-aware audit events for sensitive actions without logging secrets.
10. Test cross-company denial with at least two test companies before launch.

## Scale and concurrency
55, 100, or 1,000 simultaneous users is a target, not something a folder can guarantee. Use database constraints/indexes, pagination, bounded result sets, connection-efficient Supabase access, rate limits for expensive actions, and staging load tests. Avoid global mutable in-memory tenant state.

## Subscription context
The customer plans discussed are ₦5,000 / ₦10,000 / ₦15,000 / ₦20,000, with full CRM at ₦20,000. Enforce plan entitlements on server actions/database-facing operations, not only by hiding menu links.

## Safe implementation sequence
1. Inventory tables, views, RPCs, storage buckets, grants, RLS policies, server actions, and API routes.
2. Classify data as platform-owned, user-owned, or company-owned.
3. Add company and membership tables through reviewed migrations.
4. Map existing records to the correct company without deleting or guessing ownership.
5. Add tenant-aware helpers and update every module read/write action before exposing it to tenants.
6. Add and test RLS and storage policies.
7. Wire `/erp` to the shared existing UI/module components.
8. Enforce subscription entitlements server-side.
9. Run TypeScript, lint, production build, and cross-tenant authorization tests.
10. Enable tenant mode only after staging tests pass.

## Deliberately not done
No live SQL migration, policy, data backfill, route rewrite, or module action has been applied. The supplied archive lacks the schema/migrations needed to do that safely.
