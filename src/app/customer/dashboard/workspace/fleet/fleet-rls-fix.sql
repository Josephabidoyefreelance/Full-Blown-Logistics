-- JAAD ERP — Fleet RLS / permissions fix
-- Run the ENTIRE script in Supabase SQL Editor.
-- This keeps Fleet private to authenticated users who have the fleet/admin module.

alter table public.fleet_vehicles enable row level security;
alter table public.fleet_maintenance enable row level security;
alter table public.fleet_insurance enable row level security;

drop policy if exists fleet_vehicles_by_module on public.fleet_vehicles;
drop policy if exists fleet_maintenance_by_module on public.fleet_maintenance;
drop policy if exists fleet_insurance_by_module on public.fleet_insurance;

create policy fleet_vehicles_by_module
on public.fleet_vehicles
for all
to authenticated
using (
  auth_has_module('fleet')
  or auth_has_module('admin')
)
with check (
  auth_has_module('fleet')
  or auth_has_module('admin')
);

create policy fleet_maintenance_by_module
on public.fleet_maintenance
for all
to authenticated
using (
  auth_has_module('fleet')
  or auth_has_module('admin')
)
with check (
  auth_has_module('fleet')
  or auth_has_module('admin')
);

create policy fleet_insurance_by_module
on public.fleet_insurance
for all
to authenticated
using (
  auth_has_module('fleet')
  or auth_has_module('admin')
)
with check (
  auth_has_module('fleet')
  or auth_has_module('admin')
);

grant select, insert, update, delete on public.fleet_vehicles to authenticated;
grant select, insert, update, delete on public.fleet_maintenance to authenticated;
grant select, insert, update, delete on public.fleet_insurance to authenticated;

-- Ensure the standard Fleet roles retain Fleet access.
update public.roles
set permitted_modules = array(
  select distinct x
  from unnest(coalesce(permitted_modules, '{}'::text[]) || array['fleet']) as x
)
where name in ('Super Admin', 'Fleet Manager', 'Operations Manager');

-- Check the current user's role and modules after running the fix.
select
  p.full_name,
  p.email,
  r.name as role_name,
  r.permitted_modules
from public.profiles p
left join public.roles r on r.id = p.role_id
where p.id = auth.uid();
