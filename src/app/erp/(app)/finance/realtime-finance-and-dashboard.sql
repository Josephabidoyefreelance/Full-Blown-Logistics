-- JAAD ERP Finance + Dashboard Realtime
-- Safe to run repeatedly. Adds only tables that are not already in supabase_realtime.

do $$
declare
  t text;
begin
  foreach t in array array[
    'invoices',
    'expenses',
    'employees',
    'purchase_orders',
    'quotations',
    'bookings',
    'fleet_vehicles',
    'leads',
    'drivers',
    'tickets'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
