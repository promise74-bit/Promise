-- Promise Computer Research - Build 10: customer wallet
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- All balance changes happen inside the SECURITY DEFINER functions below, which are
-- callable ONLY by the service role (server API routes). Customers can read their own
-- wallet but can never write to it directly.

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('funding','order_payment','refund','adjustment')),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(14,2) not null check (amount > 0),
  balance_after numeric(14,2),
  status text not null default 'pending' check (status in ('pending','success','failed')),
  reference text not null unique,
  description text,
  order_id uuid references public.orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_idx on public.wallet_transactions(user_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "users can view own wallet" on public.wallets;
create policy "users can view own wallet" on public.wallets for select using (auth.uid() = user_id);
drop policy if exists "admins can view all wallets" on public.wallets;
create policy "admins can view all wallets" on public.wallets for select using (public.is_admin());
drop policy if exists "users can view own wallet transactions" on public.wallet_transactions;
create policy "users can view own wallet transactions" on public.wallet_transactions for select using (auth.uid() = user_id);
drop policy if exists "admins can view all wallet transactions" on public.wallet_transactions;
create policy "admins can view all wallet transactions" on public.wallet_transactions for select using (public.is_admin());

revoke all on public.wallets from anon, authenticated;
revoke all on public.wallet_transactions from anon, authenticated;
grant select on public.wallets to authenticated;
grant select on public.wallet_transactions to authenticated;

-- Credit a pending funding transaction exactly once (idempotent by reference).
create or replace function public.wallet_complete_funding(p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.wallet_transactions; new_balance numeric;
begin
  select * into t from public.wallet_transactions where reference = p_reference and kind = 'funding' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if t.status = 'success' then
    return jsonb_build_object('ok', true, 'already', true, 'amount', t.amount, 'balance', t.balance_after);
  end if;
  if t.status <> 'pending' then return jsonb_build_object('ok', false, 'code', 'not_pending'); end if;
  insert into public.wallets(user_id) values (t.user_id) on conflict (user_id) do nothing;
  update public.wallets set balance = balance + t.amount, updated_at = now() where user_id = t.user_id returning balance into new_balance;
  update public.wallet_transactions set status = 'success', balance_after = new_balance where id = t.id;
  return jsonb_build_object('ok', true, 'already', false, 'amount', t.amount, 'balance', new_balance, 'user_id', t.user_id);
end; $$;

-- Pay an order from the wallet: debit + mark order paid, all in one transaction.
create or replace function public.wallet_pay_order(p_order_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; w_balance numeric; new_balance numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.customer_id <> p_user_id then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if o.payment_status = 'paid' then return jsonb_build_object('ok', false, 'code', 'already_paid'); end if;
  if o.payment_status not in ('unpaid','failed') then return jsonb_build_object('ok', false, 'code', 'payment_in_progress'); end if;
  if o.status = 'cancelled' then return jsonb_build_object('ok', false, 'code', 'cancelled'); end if;
  if o.amount is null or o.amount <= 0 then return jsonb_build_object('ok', false, 'code', 'no_price'); end if;
  if exists (select 1 from public.payments where order_id = o.id and status = 'pending') then
    return jsonb_build_object('ok', false, 'code', 'payment_in_progress');
  end if;
  insert into public.wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select balance into w_balance from public.wallets where user_id = p_user_id for update;
  if w_balance < o.amount then
    return jsonb_build_object('ok', false, 'code', 'insufficient', 'balance', w_balance, 'needed', o.amount);
  end if;
  update public.wallets set balance = balance - o.amount, updated_at = now() where user_id = p_user_id returning balance into new_balance;
  insert into public.wallet_transactions(user_id, kind, direction, amount, balance_after, status, reference, description, order_id)
  values (p_user_id, 'order_payment', 'debit', o.amount, new_balance, 'success', 'WLT-ORD-' || o.id::text, 'Payment for order ' || o.reference, o.id);
  update public.orders set payment_status = 'paid', status = 'processing' where id = o.id;
  return jsonb_build_object('ok', true, 'balance', new_balance, 'amount', o.amount, 'reference', o.reference);
end; $$;

revoke all on function public.wallet_complete_funding(text) from public, anon, authenticated;
revoke all on function public.wallet_pay_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.wallet_complete_funding(text) to service_role;
grant execute on function public.wallet_pay_order(uuid, uuid) to service_role;

-- Live in-app notifications: let Supabase Realtime broadcast new notification rows.
-- (RLS still applies, so each customer only receives their own.)
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
