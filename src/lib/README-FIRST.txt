JAAD FIX 1 - CONSOLIDATED SECURITY CONTAINMENT

Contains previously supplied patches plus tenant guards for Twilio token issuance and clock-tracker report/auto-clock-out.

INSTALL: Back up project; copy src/ into project root preserving directories; review changes before deploy.
KEEP CUSTOMER_ERP_TENANT_MODE DISABLED until the full application, RLS, webhooks and cross-tenant tests have been reviewed.

THIS IS NOT VERIFIED COMPLETE TENANT ISOLATION. These changes have not been deployed or tested against your Supabase instance.

No SQL migrations included; existing RLS must not be weakened.
