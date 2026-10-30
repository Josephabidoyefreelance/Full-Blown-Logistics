JAAD LOGIN / HOMEPAGE FIRST-PASS PATCH

Files in this folder:
- jaad-homepage.tsx: public homepage with public Admin login links removed.
- jaad-customer-login.tsx: customer login card tightened; current Supabase email OTP flow retained.
- jaad-customer-signup.tsx: customer signup card tightened; current Supabase email OTP flow retained.
- jaad-admin-login.tsx: compact split-card visual matching the supplied admin screenshot; current password login retained.

Copy each file into the matching existing route's page.tsx only after making a local backup:
- jaad-homepage.tsx -> src/app/page.tsx (or whichever route currently renders the public homepage)
- jaad-customer-login.tsx -> src/app/customer/login/page.tsx
- jaad-customer-signup.tsx -> src/app/customer/signup/page.tsx
- jaad-admin-login.tsx -> src/app/admin/login/page.tsx

SECURITY STATUS: This is a visual/route-link first pass only. It does NOT yet implement Cloudflare Turnstile, admin email OTP/MFA, server-side CAPTCHA verification, rate limiting, or auth hardening. Do not treat it as a completed security upgrade. Existing login behavior is intentionally preserved until the server route/proxy configuration is confirmed.

No deployment or Git operation was performed.
