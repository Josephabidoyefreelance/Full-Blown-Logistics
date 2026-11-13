JAAD STAGE 6 — STAGING PATCH (NOT DEPLOYED)

Inspected uploaded (app) archive (331 entries). Actual signup found in (app)/customers/customer-signup-page.tsx; it uses OTP, then browser inserts into customers/leads. These inserts cannot safely implement multi-tenant signup.

Files:
- stage6_registration.sql: atomic service-role-only SQL registration function.
- src/app/api/customer/register/route.ts: authenticated server endpoint.
- src/app/(app)/customers/customer-signup-page.tsx: minimal edit of supplied page; preserves layout and OTP, adds business name, uses endpoint instead of insecure browser inserts.

DO NOT RUN ON PRODUCTION YET. First validate on staging:
1. Confirm actual route and page locations in your complete src/app tree. The uploaded ZIP is an (app) segment, not the whole Next.js project.
2. Check SUPABASE_SERVICE_ROLE_KEY is server-side only. Never prefix NEXT_PUBLIC_.
3. Review RLS and trigger behavior: service_role is required for the atomic RPC. Check company and leads insert constraints.
4. Test new business OTP, duplicate/retry, staff invitation, existing accounts, subscription gating, and JAAD lead visibility.
5. Subscription is NOT auto-activated. Connect to existing payment/onboarding flow after validating its schema and package semantics.
6. Check profiles insert permissions independently; current authenticated profiles_self_insert policy remains a privilege escalation risk.
7. Check user registration abuse controls, CAPTCHA, and rate limiting before launch.
8. Check platform admin's company UUID in SQL before applying (JAAD = af38e1dd-bd67-4f75-93fe-dc141bbe0fe7).
9. The pre-existing handle_new_customer trigger creates a customer placeholder. RPC assigns its company_id after company/profile creation.
10. Existing customer workspace safety lock remains enabled.
