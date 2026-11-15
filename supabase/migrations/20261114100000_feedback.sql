-- "Tell us where to improve": public feedback from the landing page, read in Admin → Feedback. Safe to re-run.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 3 and 2000),
  contact text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback(created_at desc);
alter table public.feedback enable row level security;  -- no policies: only the server can read or write
