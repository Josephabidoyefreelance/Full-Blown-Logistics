JAAD Registration → Super Admin CRM (source-only patch)

Files: src/app/api/customer/register/route.ts and migration SQL.

1. Verify production schema: leads.company_id uuid and profiles.is_active boolean.
2. Run the migration in Supabase after reviewing it.
3. Confirm exactly one active Super Admin profile company ID represents JAAD Logistics.
4. Deploy the route, then test verified signup and retry; check JAAD /crm and ensure the tenant cannot see the acquisition lead.
5. Existing registrations require a separately reviewed one-time backfill.

This is NOT production verified and is not the final ERP release. If lead insert fails after registration, the endpoint returns companyId plus crmLeadRecorded:false so the frontend can handle a partial success without re-registering.
Homepage, footer, admin button and calling controls are not included or modified.
