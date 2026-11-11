-- Wallet: fund by bank transfer (Paystack dedicated account). Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  customer_code text,
  bank_name text not null,
  account_number text not null unique,
  account_name text not null,
  created_at timestamptz not null default now()
);
alter table public.wallet_accounts enable row level security;
drop policy if exists "users can view own wallet account" on public.wallet_accounts;
create policy "users can view own wallet account" on public.wallet_accounts for select using (auth.uid() = user_id);
grant select on public.wallet_accounts to authenticated;

-- Credit a bank transfer exactly once (the unique reference is inserted first, so a repeated webhook cannot double-credit).
create or replace function public.wallet_credit_transfer(p_user uuid, p_amount numeric, p_reference text, p_description text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare new_balance numeric; tid uuid;
begin
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'code', 'bad_amount'); end if;
  begin
    insert into public.wallet_transactions(user_id, kind, direction, amount, status, reference, description, metadata)
    values (p_user, 'funding', 'credit', p_amount, 'pending', p_reference, p_description, jsonb_build_object('channel', 'bank_transfer'))
    returning id into tid;
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'already', true);
  end;
  insert into public.wallets(user_id) values (p_user) on conflict (user_id) do nothing;
  update public.wallets set balance = balance + p_amount, updated_at = now() where user_id = p_user returning balance into new_balance;
  update public.wallet_transactions set status = 'success', balance_after = new_balance where id = tid;
  return jsonb_build_object('ok', true, 'already', false, 'amount', p_amount, 'balance', new_balance, 'user_id', p_user);
end; $$;
revoke all on function public.wallet_credit_transfer(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.wallet_credit_transfer(uuid, numeric, text, text) to service_role;
