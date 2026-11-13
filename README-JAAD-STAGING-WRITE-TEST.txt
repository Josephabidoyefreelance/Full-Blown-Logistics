JAAD STAGING TENANT-ISOLATION WRITE TEST

Target: https://aoootywbdbuhnzfvlmrr.supabase.co (staging only)
Table under test: public.customer_erp_leads
Never connect it to JAAD LOGISTICS PROJECT production.

1. Download JAAD-STAGING-WRITE-ISOLATION.ps1 to your Windows Downloads folder.
2. Open Windows PowerShell 5.1.
3. Run:
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\JAAD-STAGING-WRITE-ISOLATION.ps1"
4. When prompted, enter staging publishable API key and both staging test logins.
   Either test account can be first; the script identifies ownership from database records.
5. It displays a preflight and asks you to type STAGING before making changes.
6. Share only the PASS / FAIL / UNVERIFIED / RESULT lines. Never share passwords or tokens.

What it does:
- Own-tenant INSERT/READ/UPDATE/DELETE with correct results verified
- Cross-tenant INSERT denied
- Cross-tenant UPDATE and DELETE matched zero rows or access denied, with target intact
- Tenant reassignment blocked
- Attempts authenticated cleanup of every temporary test lead marker using both owners

If CLEANUP_WARNINGS > 0, do not repeat the script immediately; report the warning.
The script was statically reviewed against JAAD-SCHEMA-ONLY.sql, but cannot be
executed against your staging account from this environment.

This verifies only one customer CRM table. It does not certify the whole ERP.
