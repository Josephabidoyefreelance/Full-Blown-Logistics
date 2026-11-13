# JAAD Priority 1 — Flutterwave patch (NOT YET PRODUCTION VERIFIED)

This ZIP changes only three billing API routes and adds `src/lib/billing/flutterwave.ts`. It does not alter the homepage, Admin login dot, calling UI or other ERP components.

## Required configuration (server-side only)
- `FLW_SECRET_KEY` — Flutterwave secret API key. Never put it in NEXT_PUBLIC_ variables.
- `FLW_SECRET_HASH` — secret hash configured in Flutterwave dashboard webhooks.
- `APP_URL` — your production HTTPS origin.
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — existing server settings.
- Flutterwave dashboard webhook URL: `https://YOUR-DOMAIN/api/billing/webhook`.
- Enable Nigerian bank transfer checkout in Flutterwave. Disable unwanted methods in dashboard settings as necessary.

## Must verify BEFORE applying
1. `billing_payment_attempts.payment_provider` exists and allows `flutterwave` (this source assumes it does).
2. `jaad_activate_subscription_from_payment` works for Flutterwave transactions; legacy parameter is `p_paystack_transaction_id` and is reused for Flutterwave ID.
3. Checkout route redirects to Flutterwave and only offers bank transfer (dashboard configuration may override payment_options).
4. Test bank transfer: webhook, callback, amount, reference, currency, method, single activation, duplicate webhook, failed and pending payment.
5. Validate RLS tenant isolation with separate accounts and test customer registration, subscriptions and login.

Do not run database REVOKEs or RLS migrations from this patch. Existing database permissions still require review and testing. Do not use this patch as a complete production release.
