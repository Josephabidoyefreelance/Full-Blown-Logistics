STAGE 15: Tenant-scoped Shipment Actions

Replace src/app/customer/dashboard/workspace/shipments/actions.ts.
Do not enable CUSTOMER_ERP_TENANT_MODE yet.
No SQL, no UI changes.
Adds authenticated active-company lookup, company_id to writes, company_id filters to updates/reads, and same-company validation of manifest/POD bookings.
IMPORTANT: This file was based on previously uploaded src(4).zip. Compare/merge if later patches modified the same file. Run npm run build and test with two companies before unlocking the workspace.
Other shipment APIs and modules still need review.
