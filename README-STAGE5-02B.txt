STAGE 5.2B CODE PATCH - REVIEW REQUIRED, NOT PRODUCTION APPROVED.

The project has multiple HR implementations. This patch targets the customer HR and shared public application entry points.
SQL is REVIEW ONLY: inspect existing policy definitions and verify public.auth_has_module(text) exists before applying.
The CV policy permits public uploads but needs anti-abuse controls (rate limiting, captcha, cleanup), plus review of existing storage policies.
The other HR routes and legacy records require a deliberate JAAD-vs-customer ownership decision.
No deployment, runtime database test, or Next.js build has been performed.
Do not enable CUSTOMER_ERP_TENANT_MODE based on this package.
