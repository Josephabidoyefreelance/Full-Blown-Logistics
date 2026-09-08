-- Phase 1: staff accounts under a customer company account.
-- A "team member" is a separate Supabase Auth login (own email, own OTP
-- sign-in) that is granted access to an existing customer account's data,
-- with a role that limits which dashboard tabs they can see.

create table if not exists customer_team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  -- owner_user_id = the user_id of the customer account being shared (matches
  -- customers.user_id for the account that owns the data).
  invited_email text not null,
  role text not null,
  -- role values: 'Owner', 'Marketing', 'Customer Service', 'Finance', 'Warehouse', 'Operations'
  status text not null default 'Invited',
  -- status: 'Invited' (email sent, not yet claimed) | 'Active' (logged in and linked) | 'Removed'
  member_user_id uuid references auth.users(id) on delete set null,
  -- filled in once the invited person verifies their email and logs in for the first time
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (owner_user_id, invited_email)
);

alter table customer_team_members enable row level security;

-- The account owner can see and manage their own team's rows.
create policy "Owner manages own team" on customer_team_members
  for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- A team member can see their own membership row (to know their role/status).
create policy "Member reads own membership" on customer_team_members
  for select
  using (member_user_id = auth.uid());

-- Resolves which customer account's data the currently authenticated user
-- should see: their own account if they own one, or the account they are
-- an active staff member of. Every customer-data table's RLS policy should
-- filter on `user_id = effective_customer_id()` instead of `user_id = auth.uid()`.
create or replace function effective_customer_id()
returns uuid
language sql
security definer
stable
as $$
  select coalesce(
    (select owner_user_id from customer_team_members
      where member_user_id = auth.uid() and status = 'Active'
      limit 1),
    auth.uid()
  );
$$;
