Targeted fix for the customer signup verification request.

Replace only: src/app/customer/signup/page.tsx

This patch changes only error handling around supabase.auth.verifyOtp:
- Catches network exceptions such as "Failed to fetch".
- Shows a useful message in the existing form rather than throwing an unhandled request error.
- Does not change colours, page layout, form fields, or styling.
- Preserves the existing customer upsert logic from the previous targeted patch.

Important: "Failed to fetch" means the browser could not complete the request to Supabase; it is not proof that the email code is incorrect. If it continues, check .env.local values for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY/public key, restart the dev server, and inspect DevTools > Network for the failed request. Never share service-role/secret keys.
