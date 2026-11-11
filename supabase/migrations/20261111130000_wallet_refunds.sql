-- Automated refunds: when a paid order definitely fails to deliver, the customer's money goes back to their wallet.
-- Safe to re-run. Run once in the Supabase SQL Editor.
create or replace function public.wallet_refund_order(p_order_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; new_balance numeric; tid uuid;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if o.payment_status = 'refunded' then return jsonb_build_object('ok', true, 'already', true); end if;
  if o.payment_status <> 'paid' then return jsonb_build_object('ok', false, 'code', 'not_paid'); end if;
  if o.status = 'completed' then return jsonb_build_object('ok', false, 'code', 'already_delivered'); end if;
  if o.customer_id is null or o.amount is null or o.amount <= 0 then return jsonb_build_object('ok', false, 'code', 'no_amount'); end if;

  -- The unique reference is inserted first, so two refund attempts can never both pay out.
  begin
    insert into public.wallet_transactions(user_id, kind, direction, amount, status, reference, description, order_id, metadata)
    values (o.customer_id, 'refund', 'credit', o.amount, 'pending', 'REFUND-' || o.id::text, 'Refund for order ' || o.reference, o.id, jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)))
    returning id into tid;
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'already', true);
  end;

  insert into public.wallets(user_id) values (o.customer_id) on conflict (user_id) do nothing;
  update public.wallets set balance = balance + o.amount, updated_at = now() where user_id = o.customer_id returning balance into new_balance;
  update public.wallet_transactions set status = 'success', balance_after = new_balance where id = tid;
  update public.orders set payment_status = 'refunded', status = 'cancelled',
    admin_note = 'Delivery failed, so your payment was refunded to your wallet.' where id = o.id;
  return jsonb_build_object('ok', true, 'already', false, 'amount', o.amount, 'balance', new_balance, 'user_id', o.customer_id, 'reference', o.reference);
end; $$;
revoke all on function public.wallet_refund_order(uuid, text) from public, anon, authenticated;
grant execute on function public.wallet_refund_order(uuid, text) to service_role;
