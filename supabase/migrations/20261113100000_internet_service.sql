-- Adds the Internet (Smile / Spectranet) service. Safe to re-run.
insert into public.services (slug, title, category, description, price_type, price, active, sort_order)
values ('internet-subscription', 'Internet (Smile / Spectranet)', 'Utilities', 'Buy Smile or Spectranet internet plans.', 'request', null, true, 29)
on conflict (slug) do update set title = excluded.title, active = true, updated_at = now();
