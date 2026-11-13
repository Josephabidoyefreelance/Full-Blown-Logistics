JAAD TURNSTILE WIDGET REPAIR
Scope: replaces src/components/turnstile-box.tsx ONLY.
Fixes duplicate render/remove lifecycle and uses the normal visible Turnstile size.
Does NOT bypass production Cloudflare verification or change ERP UI, tenant isolation, billing, or auth logic.
The localhost reset-password page intentionally does not display Turnstile in development.
Supabase SMTP/email errors and production deployment/configuration must be verified separately.
Back up the original file before extraction.
