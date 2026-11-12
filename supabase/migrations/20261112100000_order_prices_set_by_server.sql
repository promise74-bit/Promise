-- Fix: orders for GOtv, StarTimes, Exam PINs, Recharge PINs (and the JAMB markup) were being reset to ₦0 / the list price.
-- Our server (service role) now sets the final price. Direct inserts from a browser still cannot choose their own price.
-- Safe to re-run.
create or replace function public.enforce_order_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slug text; v_price numeric; v_price_type text; v_active boolean;
begin
  select slug, price, price_type, active into v_slug, v_price, v_price_type, v_active
  from public.services where id = new.service_id;

  if not found then raise exception 'Invalid service.'; end if;
  if v_active is not true then raise exception 'This service is not currently available.'; end if;

  if auth.role() = 'service_role' then
    return new;  -- trusted server code calculated the amount (live provider price + our markup)
  end if;

  if v_price_type = 'fixed' then new.amount := coalesce(v_price, 0); else new.amount := 0; end if;
  new.customer_id := auth.uid();
  return new;
end;
$$;
