-- Push notifications: stores each customer's devices and sends a push whenever a notification row is created.
-- Safe to re-run. Run once in the Supabase SQL Editor.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;  -- no policies: only the server can read or write

create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public, extensions, net as $$
begin
  perform net.http_post(
    url := 'https://promisecomputerresearch.com.ng/api/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', 'e6c9aeebace54fa21a80f0c20984cbb0f212cac7d1acd5c9'),
    body := jsonb_build_object('record', jsonb_build_object('user_id', new.user_id, 'title', new.title, 'message', new.message))
  );
  return new;
exception when others then
  return new;  -- a push problem must never stop a notification from being saved
end; $$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.push_on_notification();
