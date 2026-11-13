create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

create policy "Allow read for authenticated" on announcements
  for select to authenticated using (true);

create policy "Allow insert for authenticated" on announcements
  for insert to authenticated with check (true);

create policy "Allow delete for authenticated" on announcements
  for delete to authenticated using (true);
