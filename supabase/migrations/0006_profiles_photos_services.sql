-- Vulcatic 1.5.0: profile photos on pins, private details (name, mobile, GCash), services and prices.
-- Adds columns, one table and one photo bucket. Changes and deletes no existing rows.
begin;

-- ─── Private details: only the owner sees them; the admin sees Vulcators and shops only ─
create table public.private_details (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 80),
  mobile     text check (char_length(mobile) <= 30),
  gcash      text check (char_length(gcash) <= 30)
);
alter table public.private_details enable row level security;

create policy "people see own details, admins see owners' details"
  on public.private_details for select to authenticated
  using (
    user_id = (select auth.uid())
    or ((select public.is_admin()) and exists (select 1 from public.profiles p where p.id = user_id and p.role <> 'user'))
  );
create policy "people add own details"
  on public.private_details for insert to authenticated with check (user_id = (select auth.uid()));
create policy "people update own details"
  on public.private_details for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─── Photos ─────────────────────────────────────────────────────────────────
-- No update or delete rule on purpose: an approved photo can't be swapped behind the same link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── Services and prices ────────────────────────────────────────────────────
create function public.valid_prices(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object' and not exists (
    select 1 from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}' end) e
    where e.key not in ('flat_tire', 'vulcanizing', 'replacement', 'air_refill', 'jump_start')
      or case when jsonb_typeof(e.value) = 'number' then e.value::numeric not between 1 and 100000 else true end
  );
$$;

alter table public.places
  add column photo_path  text,
  add column prices      jsonb not null default '{}' check (public.valid_prices(prices)),
  add column roadside    boolean,  -- null = the usual for its kind
  add column shop_visits boolean;

-- ─── Owner rules: same as before, plus the photo and a way to send a pin back for checking ─
create or replace function public.guard_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;  -- SQL editor
  if public.is_admin() then
    if tg_op = 'INSERT' then new.approved = true; end if;
    return new;
  end if;
  if length(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g')) < 7 then
    raise exception 'Please enter a phone number customers can call.';
  end if;
  -- The pin always shows the owner's profile photo.
  new.photo_path = (select avatar_url from public.profiles where id = auth.uid());
  if tg_op = 'INSERT' then
    new.owner_id = auth.uid();
    new.created_by = auth.uid();
    new.approved = false;
    new.is_demo = false;
  else
    new.owner_id = old.owner_id;
    new.created_by = old.created_by;
    new.created_at = old.created_at;
    new.is_demo = old.is_demo;
    new.kind = old.kind;
    -- Hours, prices, status and a Vulcator's location change every day, so they need no new check.
    new.approved = old.approved and new.approved
      and (new.name, new.phone, new.address, new.description, new.photo_path)
          is not distinct from (old.name, old.phone, old.address, old.description, old.photo_path)
      and (old.kind = 'vulcator' or (new.lat, new.lng) is not distinct from (old.lat, old.lng));
  end if;
  return new;
end;
$$;

-- A new profile photo goes to the pin (and back to the admin). The photo must be in the person's own folder.
create function public.avatar_to_pin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.avatar_url is not null and new.avatar_url not like new.id::text || '/%' then
    raise exception 'That photo is not yours.';
  end if;
  update public.places set photo_path = new.avatar_url where owner_id = new.id;
  return null;
end;
$$;
create trigger profiles_avatar_to_pin
  after update on public.profiles
  for each row when (new.avatar_url is distinct from old.avatar_url)
  execute function public.avatar_to_pin();

-- A new GCash number sends the pin back to the admin.
create function public.gcash_recheck()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.places set approved = false where owner_id = new.user_id and approved;
  return null;
end;
$$;
create trigger private_details_gcash_added
  after insert on public.private_details
  for each row when (new.gcash is not null) execute function public.gcash_recheck();
create trigger private_details_gcash_changed
  after update on public.private_details
  for each row when (new.gcash is distinct from old.gcash) execute function public.gcash_recheck();

revoke execute on function public.avatar_to_pin() from public, anon, authenticated;
revoke execute on function public.gcash_recheck() from public, anon, authenticated;

commit;
