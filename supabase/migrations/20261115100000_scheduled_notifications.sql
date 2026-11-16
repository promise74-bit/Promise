-- Scheduled notifications from Admin. At the chosen time the notification is created for the customers; creating it
-- shows it in their in-app bell AND sends the real push (the notifications trigger does that). Safe to re-run.
create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  message text not null check (char_length(message) between 1 and 500),
  audience text not null check (audience in ('all','one')),
  user_id uuid references public.profiles(id) on delete cascade,
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled')),
  recipients int,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_notifications_due_idx on public.scheduled_notifications(status, send_at);
alter table public.scheduled_notifications enable row level security;  -- server only

create or replace function public.dispatch_scheduled_notifications()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.scheduled_notifications; n int; out jsonb := '[]'::jsonb;
begin
  for r in select * from public.scheduled_notifications where status = 'pending' and send_at <= now() order by send_at for update skip locked loop
    if r.audience = 'all' then
      insert into public.notifications(user_id, title, message) select id, r.title, r.message from public.profiles;
      get diagnostics n = row_count;
    else
      insert into public.notifications(user_id, title, message) values (r.user_id, r.title, r.message); n := 1;
    end if;
    update public.scheduled_notifications set status = 'sent', sent_at = now(), recipients = n where id = r.id;
    out := out || jsonb_build_array(jsonb_build_object('id', r.id, 'recipients', n));
  end loop;
  return out;
end; $$;
revoke all on function public.dispatch_scheduled_notifications() from public, anon, authenticated;
grant execute on function public.dispatch_scheduled_notifications() to service_role;

-- Run it every minute with Supabase's built-in scheduler.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'dispatch-scheduled-notifications';
select cron.schedule('dispatch-scheduled-notifications', '* * * * *', 'select public.dispatch_scheduled_notifications()');
