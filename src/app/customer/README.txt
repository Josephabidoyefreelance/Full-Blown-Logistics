JAAD CUSTOMER BUILD FIX — TWO MISSING IMPORTS

Cause: src/app/customer/layout.tsx imports two components as if they live alongside layout.tsx. In the customer dashboard archive they live under src/app/customer/dashboard/.

From your jaad-backend project folder in PowerShell:
1. Extract this ZIP.
2. Run:
   powershell -ExecutionPolicy Bypass -File ".\FIX-CUSTOMER-IMPORTS.ps1"
   (Place the script in your project root first, or specify the full path to the script while your terminal is in the project root.)
3. Run: npm run build

The script verifies both existing component files, backs up src/app/customer/layout.tsx, and changes only the two imports. It does not change the dashboard or security policies.

Manual alternative in src/app/customer/layout.tsx:
from './customer-sign-out-button' -> from './dashboard/customer-sign-out-button'
from './customer-digital-clock' -> from './dashboard/customer-digital-clock'

The eslint and Turbopack-root messages in the log are warnings, not the two build-stopping errors.
