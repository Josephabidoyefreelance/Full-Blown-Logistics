-- JAAD Finance production columns
-- Run once in Supabase SQL Editor. Safe to run repeatedly.

-- Expenses need a payment state so the UI can record Paid / Unpaid.
alter table public.expenses
  add column if not exists status text not null default 'Unpaid';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'expenses_status_check'
      and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_status_check check (status in ('Paid','Unpaid'));
  end if;
end $$;

-- Purchase orders: fields used in normal day-to-day procurement.
alter table public.purchase_orders add column if not exists category text default 'General';
alter table public.purchase_orders add column if not exists requested_by text;
alter table public.purchase_orders add column if not exists expected_date date;
alter table public.purchase_orders add column if not exists payment_terms text;
alter table public.purchase_orders add column if not exists priority text default 'Normal';

-- Existing columns from the original JAAD schema are retained:
-- po_no, supplier, total, status, items_description, po_date.

-- Make the newer application aliases available where they are missing.
alter table public.purchase_orders add column if not exists description text;
alter table public.purchase_orders add column if not exists order_date date default current_date;

-- Keep order_date aligned with the original po_date where it is blank.
update public.purchase_orders
set order_date = po_date
where order_date is null and po_date is not null;

update public.purchase_orders
set description = items_description
where description is null and items_description is not null;

-- The original quotations schema stores line items separately; the Finance UI also
-- keeps a convenient quoted total for fast list/report views.
alter table public.quotations add column if not exists amount numeric(14,2) not null default 0;

-- Quotation table already contains the useful operational fields:
-- contact, route, mode, quote_date, valid_until, status.

-- Realtime publication for all Finance/Dashboard data used by the application.
do $$
declare
  t text;
begin
  foreach t in array array[
    'invoices','expenses','employees','purchase_orders','quotations',
    'bookings','fleet_vehicles','leads','drivers','tickets'
  ] loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
