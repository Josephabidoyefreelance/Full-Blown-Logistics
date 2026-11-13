# Tenant helper implementation gate

Implement production helpers only after reviewing the existing `lib/supabase/server`, profile/role model, admin security helper, and actual schema.

Required responsibilities:
- obtain the authenticated user through Supabase server auth
- resolve active company from a database membership row
- reject users without an active company membership
- check company role and module entitlement on the server
- never trust browser-supplied ownership as authoritative
- return typed, explicit errors instead of silently falling back to another company

Do not create a service-role client for normal tenant reads/writes. Use the existing authenticated Supabase server client and RLS.
