-- Lets a customer (business) account invite staff members with their own
-- logins, each assigned a role that controls which dashboard tabs they see.

create table if not exists customer_team_members (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text,
  role text not null default 'Customer Service',
  status text not null default 'Invited', -- 'Invited' | 'Active' | 'Suspended'
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table customer_team_members enable row level security;

-- The owning customer (business account) can see and manage their own team.
create policy "Owner manages own team" on customer_team_members
  for all
  using (customer_id in (select id from customers where user_id = auth.uid()))
  with check (customer_id in (select id from customers where user_id = auth.uid()));

-- A team member can see their own membership row (to know their own role).
create policy "Team member sees own row" on customer_team_members
  for select
  using (user_id = auth.uid());

-- Helper: resolves which customer's data a given auth user should see.
-- Returns the owning customer's own user_id if they ARE the owner,
-- otherwise the parent owner's user_id if they're an accepted team member,
-- otherwise null (no access).
create or replace function effective_customer_owner_id(uid uuid)
returns uuid
language sql
security definer
stable
as $$
  select coalesce(
    (select user_id from customers where user_id = uid limit 1),
    (
      select c.user_id
      from customer_team_members tm
      join customers c on c.id = tm.customer_id
      where tm.user_id = uid and tm.status = 'Active'
      limit 1
    )
  );
$$;
