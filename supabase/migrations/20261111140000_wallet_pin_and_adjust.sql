-- Payment PIN + admin wallet adjustment. Safe to re-run. Run once in the Supabase SQL Editor.
create table if not exists public.transaction_pins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.transaction_pins enable row level security;  -- no policies: only the server (service role) can read it

create or replace function public.wallet_admin_adjust(p_user uuid, p_amount numeric, p_direction text, p_reason text, p_admin uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur numeric; new_balance numeric;
begin
  if p_direction not in ('credit','debit') or p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'code', 'bad_input'); end if;
  if not exists (select 1 from public.profiles where id = p_user) then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  insert into public.wallets(user_id) values (p_user) on conflict (user_id) do nothing;
  select balance into cur from public.wallets where user_id = p_user for update;
  if p_direction = 'debit' and cur < p_amount then return jsonb_build_object('ok', false, 'code', 'insufficient', 'balance', cur); end if;
  update public.wallets set balance = balance + (case when p_direction = 'credit' then p_amount else -p_amount end), updated_at = now()
    where user_id = p_user returning balance into new_balance;
  insert into public.wallet_transactions(user_id, kind, direction, amount, balance_after, status, reference, description, metadata)
  values (p_user, 'adjustment', p_direction, p_amount, new_balance, 'success', 'ADJ-' || gen_random_uuid()::text, 'Wallet adjustment by admin',
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 200), 'admin', p_admin));
  return jsonb_build_object('ok', true, 'balance', new_balance, 'previous', cur);
end; $$;
revoke all on function public.wallet_admin_adjust(uuid, numeric, text, text, uuid) from public, anon, authenticated;
grant execute on function public.wallet_admin_adjust(uuid, numeric, text, text, uuid) to service_role;

-- Safety net against double purchases: one order per customer per idempotency key.
create unique index if not exists orders_idempotency_key_idx
  on public.orders (customer_id, (form_data->>'idempotency_key'))
  where form_data ? 'idempotency_key';
