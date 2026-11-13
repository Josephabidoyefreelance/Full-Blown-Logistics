-- JAAD ERP profile + tenant workspace settings migration.
-- Run once in the Supabase SQL Editor for the same project used by localhost.
-- This adds fields only; it does not drop tables, columns, or existing policies.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text;

alter table public.customers
  add column if not exists company_name text,
  add column if not exists business_address text,
  add column if not exists currency text not null default 'NGN',
  add column if not exists tax_rate numeric(5,2) not null default 7.50,
  add column if not exists logo_url text;

-- Use a public-read bucket for logo display, but restrict uploads/changes to a
-- folder named after the customer's UUID and the owning authenticated account.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Tenant logos are publicly readable') then
    create policy "Tenant logos are publicly readable" on storage.objects
      for select using (bucket_id = 'logos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Tenant owners upload their own logo') then
    create policy "Tenant owners upload their own logo" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'logos'
        and exists (
          select 1 from public.customers c
          where c.id::text = (storage.foldername(name))[1]
            and c.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Tenant owners update their own logo') then
    create policy "Tenant owners update their own logo" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'logos'
        and exists (select 1 from public.customers c where c.id::text = (storage.foldername(name))[1] and c.user_id = auth.uid())
      )
      with check (
        bucket_id = 'logos'
        and exists (select 1 from public.customers c where c.id::text = (storage.foldername(name))[1] and c.user_id = auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Tenant owners delete their own logo') then
    create policy "Tenant owners delete their own logo" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'logos'
        and exists (select 1 from public.customers c where c.id::text = (storage.foldername(name))[1] and c.user_id = auth.uid())
      );
  end if;
end $$;
