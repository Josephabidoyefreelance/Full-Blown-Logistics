# Tenant migration gate

Do not add a generic `company_id` migration until the actual Supabase schema, views, triggers, foreign keys, and existing data ownership have been inspected.

The reviewed migration set will need to define as appropriate:
- `companies`
- `company_memberships` (auth user ↔ company ↔ role/status)
- subscription/plan entitlement records if not already present
- tenant ownership keys and indexes on company-owned business tables
- safe backfills for existing records
- RLS policies for each affected table/view/RPC/storage bucket
- grants, constraints, and rollback/forward-repair notes

Do not put `company_id` on a view as though it were a base table. Update underlying tables and revise view definitions where required. Preserve existing sample and production records.
