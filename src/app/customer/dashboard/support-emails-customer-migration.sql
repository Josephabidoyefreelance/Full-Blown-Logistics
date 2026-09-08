-- Links support_emails rows to the customer who sent/received them, so the
-- customer portal can show only their own email thread.
alter table support_emails add column if not exists customer_user_id uuid references auth.users(id);

create index if not exists support_emails_customer_user_id_idx on support_emails(customer_user_id);

-- RLS is commented out on purpose. Your admin ERP already reads/writes this
-- table. If admin's Supabase client uses the authenticated (not service)
-- role, turning RLS on here could suddenly hide rows from admin staff too.
-- Confirm which client role your admin support page uses before enabling
-- this. Uncomment only after confirming.

-- alter table support_emails enable row level security;
--
-- drop policy if exists "Customers can view their own emails" on support_emails;
-- create policy "Customers can view their own emails"
-- on support_emails for select
-- to authenticated
-- using (customer_user_id = auth.uid());
--
-- drop policy if exists "Customers can insert their own emails" on support_emails;
-- create policy "Customers can insert their own emails"
-- on support_emails for insert
-- to authenticated
-- with check (customer_user_id = auth.uid());
