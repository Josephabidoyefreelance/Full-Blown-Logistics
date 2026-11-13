-- Safe, non-destructive: only adds columns that are missing.
-- Does not touch existing data or drop anything, so it can't fail
-- on foreign key dependents like quotation_items.

alter table purchase_orders add column if not exists po_no text;
alter table purchase_orders add column if not exists supplier text;
alter table purchase_orders add column if not exists description text;
alter table purchase_orders add column if not exists total numeric default 0;
alter table purchase_orders add column if not exists order_date date default current_date;
alter table purchase_orders add column if not exists status text default 'Pending';

alter table quotations add column if not exists reference text;
alter table quotations add column if not exists customer_name text;
alter table quotations add column if not exists route text;
alter table quotations add column if not exists amount numeric default 0;
alter table quotations add column if not exists quote_date date default current_date;
alter table quotations add column if not exists status text default 'Pending';
