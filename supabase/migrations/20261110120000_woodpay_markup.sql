-- WoodPay replaces Pairgate. Run once in the Supabase SQL Editor.
-- Owner-editable markup per service (Admin → Markup). Seeded with the previous site rates so nothing changes until edited.
create table if not exists public.markup_settings (
  category text primary key check (category in ('airtime','data','cable','electricity')),
  mode text not null default 'percent' check (mode in ('percent','flat')),
  value numeric(12,2) not null default 0 check (value >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.markup_settings enable row level security;
-- No public policies: the app reads/writes this table only through the server (service role).
insert into public.markup_settings (category, mode, value) values
  ('airtime','percent',3), ('data','percent',5), ('cable','percent',5), ('electricity','percent',5)
on conflict (category) do nothing;

alter table public.provider_transactions alter column provider set default 'woodpay';
