JAAD Logistics Turnstile Security Patch
========================================

This package applies a targeted security patch to the existing JAAD Logistics
Next.js project. It is designed to preserve the existing UI/layout and only
change the Turnstile verification route and action settings.

HOSTNAMES
- Local development: localhost (only when NODE_ENV=development)
- Production/deployed environment: jaadlogistics.com
- Production/deployed environment: www.jaadlogistics.com
- Production/deployed environment: full-blown-logistics.vercel.app

HOW TO APPLY
1. Extract this ZIP into your existing jaad-backend project root:
   C:\Users\DELL\Desktop\VS Code 2\Full Blown Logistics\jaad-backend
2. Open PowerShell in that project root.
3. Run:
   powershell -ExecutionPolicy Bypass -File .\apply-turnstile-security-fix.ps1

The script checks expected file patterns before writing. If any expected pattern
does not match, it stops before changing project files. It creates backups
under .local-backups before applying changes.

AFTER APPLYING
Run these commands one at a time:
  git diff --check
  npx tsc --noEmit
  npm run lint
  npm run build

Do not deploy until the checks and login tests pass. No Git commit, push, merge,
or deployment is performed by this package.

SCOPE LIMITATION
This package hardens Turnstile verification and configures action values. It
does not yet implement distributed server-side rate limiting for the Turnstile
and OTP endpoints; that remains a separate follow-up security task.
