-- Run this once against your Supabase project.
-- Adds a per-customer tax rate, and makes sure currency exists with a default.

alter table customers
  add column if not exists currency text not null default 'NGN';

alter table customers
  add column if not exists tax_rate numeric not null default 7.5;
-- tax_rate is stored as a percentage number, e.g. 7.5 means 7.5%.
