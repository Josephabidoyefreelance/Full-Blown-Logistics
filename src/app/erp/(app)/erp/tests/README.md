# Required tenant-isolation tests

Use staging/test accounts and non-production records.

1. Company A can read/write A records when its role permits it.
2. A cannot select/update/delete B records, even by changing an ID.
3. A cannot insert a record with B's `company_id`.
4. An update cannot change a record's `company_id`.
5. Signed-out requests cannot read private tenant data.
6. A company admin cannot elevate themselves to platform Super Admin.
7. A user without active membership is denied.
8. Module/plan entitlements are checked server-side in UI entry points and server actions.
9. Storage downloads/uploads obey the tenant boundary.
10. Existing platform Super Admin workflows continue only through their explicit authorized path.
11. Concurrent create/update tests do not create duplicate memberships/subscriptions.
12. Pagination and exports do not leak rows across companies.
