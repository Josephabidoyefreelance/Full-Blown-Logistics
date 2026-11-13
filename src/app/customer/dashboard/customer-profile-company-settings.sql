-- JAAD customer workspace profile and tenant branding settings.
-- Run once in Supabase SQL Editor before deploying the updated customer dashboard.
-- Safe to rerun: all columns are added only if they do not already exist.

alter table public.customers
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists address text,
  add column if not exists currency text not null default 'NGN',
  add column if not exists tax_rate numeric not null default 7.5,
  add column if not exists logo_url text;

comment on column public.customers.tax_rate is
  'Tenant-configured tax percentage; 7.5 represents 7.5 percent.';
comment on column public.customers.logo_url is
  'Tenant-owned logo used in the customer workspace and newly created invoices.';
