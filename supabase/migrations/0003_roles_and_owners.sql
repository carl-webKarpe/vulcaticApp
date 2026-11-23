-- Vulcatic 1.3.0: account types, shop/Vulcator owners, admin approval, public map
-- Adds columns and rules only. No rows are deleted.
begin;

-- ─── Account type (gives no power by itself: pins still need admin approval) ─
alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'vulcator', 'shop'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  wanted text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    case when wanted in ('vulcator', 'shop') then wanted else 'user' end
  );
  return new;
end;
$$;

-- ─── Owners, approval, open/available status ────────────────────────────────
alter table public.places
  add column owner_id uuid unique references auth.users (id) on delete cascade, -- one pin per owner
  add column approved boolean not null default false,
  add column is_open  boolean;  -- null = owner has not said

update public.places set approved = true;  -- the pins that already exist stay visible

-- Owners can never approve themselves, change type, or take over another pin.
create function public.guard_place()
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
  if tg_op = 'INSERT' then
    new.owner_id = auth.uid();
    new.created_by = auth.uid();
    new.approved = false;
    new.is_demo = false;
  else
    new.owner_id = old.owner_id;
    new.created_by = old.created_by;
    new.created_at = old.created_at;
    new.approved = old.approved;
    new.is_demo = old.is_demo;
    new.kind = old.kind;
  end if;
  return new;
end;
$$;

create trigger places_guard
  before insert or update on public.places
  for each row execute function public.guard_place();

-- ─── Who can see and change pins ────────────────────────────────────────────
drop policy "places are readable by signed-in users" on public.places;
create policy "guests see approved real places"
  on public.places for select to anon using (approved and not is_demo);
create policy "signed-in users see approved, own, or all if admin"
  on public.places for select to authenticated
  using (approved or owner_id = (select auth.uid()) or (select public.is_admin()));

create policy "owners add own place"
  on public.places for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and kind = (select role from public.profiles where id = (select auth.uid()))
  );
create policy "owners update own place"
  on public.places for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete own place"
  on public.places for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ─── Close the security warnings ────────────────────────────────────────────
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_place() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

commit;
