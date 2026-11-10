-- Adds a JAMB markup line to Admin → Markup. Safe to run more than once.
alter table public.markup_settings drop constraint if exists markup_settings_category_check;
alter table public.markup_settings add constraint markup_settings_category_check
  check (category in ('airtime','data','cable','electricity','jamb'));
insert into public.markup_settings (category, mode, value) values ('jamb','flat',200)
on conflict (category) do nothing;
