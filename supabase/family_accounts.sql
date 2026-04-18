create table if not exists family_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  family_id uuid not null default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table family_accounts enable row level security;
create policy "anon_all" on family_accounts for all to anon using (true) with check (true);

-- Seed the demo account linked to the existing demo family
insert into family_accounts (email, password, family_id)
values ('js9402@princeton.edu', 'hackprinceton', '11111111-1111-1111-1111-111111111111')
on conflict (email) do nothing;
