# JAAD ERP — Tenant-isolation code correction / staging candidate

**Source:** exact user-uploaded `JAAD-TENANT-CURRENT.zip` dated 2026-11-03. **Scope: tenant isolation only.**

## Included corrections

- Warehouse inventory: company-filtered SELECT and company-owned INSERT/UPDATE/DELETE with server-side module authorization.
- Drivers: restrict the separate inline update action and page reads to the current company.
- Fleet: restrict vehicle and maintenance reads by company; load insurance records only through IDs of vehicles belonging to the current company.
- HR: restrict employee and leave list reads by company and only request employee-document signed URLs from that company's storage prefix.
- Clock Tracker: restrict time records to both the signed-in user and selected company on page, server actions, and customer-specific API endpoints. Inserts specify the server-verified company.

## Installation (staging only)

1. **Back up your full project and database.** Do not run against production while live cross-company tests are outstanding.
2. Extract the ZIP and open PowerShell in the extracted folder.
3. Execute `node .\INSTALL.js "C:\Users\DELL\Desktop\VS Code 2\Full Blown Logistics\jaad-backend" --dry-run`.
4. Only if all 9 files show `READY` or `ALREADY-INSTALLED`, run the same command with `--install`.
5. In the project directory run `npx tsc --noEmit` and `npm run build`. A build that skips TypeScript checks does not establish successful type checking.
6. Use `TEST-READ-ONLY.ps1` with two unrelated customer test accounts. Passwords must be entered in local PowerShell; do not send them to ChatGPT.

## Limits / protection

**NOT a completed Stage 2 certification.** No current Supabase RLS policies were modified; the 2026-11-03 live-policy audit still showed sensitive public/tracking privileges requiring authenticated read/write and Storage negative tests. Code-level company filters are defense in depth, not a substitute for Supabase RLS. Do not set `CUSTOMER_ERP_TENANT_MODE=enabled` yet. The full operation scope (including public support webhooks, storage, child tables and staff roles) still needs authorization tests and potentially further coordinated code/SQL changes. This is a reviewable staging code overlay, not final production clearance.

No subscription plan, 14-day trial, billing, currency, tax, logo, CSS, homepage, header or footer files are included. The installer checks SHA256 hashes and refuses to overwrite unexpected local revisions; backups go under `.jaad-tenant-isolation-backups` in the project.
