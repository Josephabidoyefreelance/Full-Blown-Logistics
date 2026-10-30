JAAD Logistics admin login UI fix

File to replace in your local project:
src/app/admin/login/page.tsx

This restores the compact split black/red and white login card, the authorization checkbox, and the visible red "Continue as admin" button. It preserves the existing Supabase signInWithPassword call and dashboard redirect.

This is a source-file patch only. It has not been deployed or tested against your local project. Back up your current page.tsx before replacing it. No Git push or deployment was performed.
