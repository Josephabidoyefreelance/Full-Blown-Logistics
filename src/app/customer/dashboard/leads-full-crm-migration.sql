alter table customer_leads add column if not exists job_title text;
alter table customer_leads add column if not exists email text;
alter table customer_leads add column if not exists phone text;
alter table customer_leads add column if not exists source text;
alter table customer_leads add column if not exists transport_mode text;
alter table customer_leads add column if not exists origin text;
alter table customer_leads add column if not exists destination text;
alter table customer_leads add column if not exists deal_value numeric default 0;
alter table customer_leads add column if not exists call_back_date date;

create table if not exists customer_lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references customer_leads(id) on delete cascade not null,
  author_name text,
  content text not null,
  created_at timestamptz default now()
);

alter table customer_lead_notes enable row level security;

drop policy if exists "Customers manage notes on their own leads" on customer_lead_notes;
create policy "Customers manage notes on their own leads"
on customer_lead_notes for all
to authenticated
using (
  exists (select 1 from customer_leads where customer_leads.id = customer_lead_notes.lead_id and customer_leads.user_id = auth.uid())
)
with check (
  exists (select 1 from customer_leads where customer_leads.id = customer_lead_notes.lead_id and customer_leads.user_id = auth.uid())
);
