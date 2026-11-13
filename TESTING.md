# Required staging tests before production

1. Company A trial (Basic, end date in future) is allowed into each Basic module **only after** the operational security flag is deliberately enabled in isolated staging. Company B has a different workspace and identical Basic entitlement without seeing A's data.
2. As company A owner, save workspace currency USD and tax 17.5. Refresh and sign out/in; values must remain unchanged. Company B retains its own currency/tax.
3. Upload a logo to A. The API must return `ok:true`, the persisted logo URL must belong to A's company ID, the signed preview must display, and B must never be able to read the Storage object by a forged URL/path.
4. With A's browser intentionally holding B's old tenant cookie, A must still resolve only an authorized tenant and never use B's workspace.
5. As an unauthorized user or expired trial, verify company settings PATCH and logo insert are denied. Staff may read only the selected workspace preferences; non-owner staff cannot update them.
6. Verify operational module records with real authenticated A/B sessions and their JWTs. Test CRM lead, customer management record, shipment/booking and their child records with cross-tenant SELECT, INSERT, UPDATE and DELETE. All cross-company operations must return no rows or 403; same-company operations should succeed if plan/role permits.
7. Check expired subscription cannot access operational data and can still reach renewal checkout. Check 14-day signup provisioning applies to each new company, not special accounts.
8. `npm run build` must pass and browser console/network errors must be resolved.

**Do not label Stage 2 passed or set `CUSTOMER_ERP_TENANT_MODE=enabled` on production until all checks pass.**
