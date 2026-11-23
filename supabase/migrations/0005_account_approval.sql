-- Vulcatic 1.4.0: Vulcator and shop accounts wait for admin approval; admin dashboard numbers.
-- Deletes no rows. Existing Vulcator/shop accounts (carl123) become "pending"; users stay approved.
begin;

alter table public.profiles
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected'));
update public.profiles set status = 'pending' where role in ('vulcator', 'shop');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  wanted text := new.raw_user_meta_data ->> 'role';
  is_owner boolean := coalesce(wanted in ('vulcator', 'shop'), false);
begin
  insert into public.profiles (id, username, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    case when is_owner then wanted else 'user' end,
    case when is_owner then 'pending' else 'approved' end
  );
  return new;
end;
$$;

-- Nobody can approve their own account or change their type. Suspending an account hides its pin.
create function public.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;  -- SQL editor
  new.id = old.id;
  new.created_at = old.created_at;
  new.role = old.role;
  if not public.is_admin() then
    new.status = old.status;
  else
    if new.id <> auth.uid() then
      new.username = old.username;
      new.avatar_url = old.avatar_url;
    end if;
    if new.status <> 'approved' then
      update public.places set approved = false where owner_id = new.id and approved;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile();

create policy "admins update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Only approved accounts may add a pin, and a pin can't go live while its owner isn't approved.
drop policy "owners add own place" on public.places;
create policy "owners add own place"
  on public.places for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = places.kind and p.status = 'approved'
    )
  );
create policy "live pins need an approved owner"
  on public.places as restrictive for update to authenticated
  using (true)
  with check (
    not approved or owner_id is null
    or exists (select 1 from public.profiles p where p.id = places.owner_id and p.status = 'approved')
  );

-- Numbers for the dashboard. Counts only: no emails, no posts, no customer activity.
create function public.admin_report()
returns json
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return json_build_object(
    'users',             (select count(*) from public.profiles where role = 'user' and id <> auth.uid()),
    'vulcators',         (select count(*) from public.profiles where role = 'vulcator'),
    'shops',             (select count(*) from public.profiles where role = 'shop'),
    'pending_accounts',  (select count(*) from public.profiles where status = 'pending'),
    'rejected_accounts', (select count(*) from public.profiles where status = 'rejected'),
    'pending_pins',      (select count(*) from public.places pl where not pl.approved
                            and not exists (select 1 from public.profiles p where p.id = pl.owner_id and p.status <> 'approved')),
    'live_pins',         (select count(*) from public.places where approved and not is_demo),
    'open_now',          (select count(*) from public.places where approved and not is_demo and is_open
                            and updated_at > now() - interval '12 hours'),
    'signups', (
      select json_agg(json_build_object('day', d::date, 'count',
        (select count(*) from public.profiles p where (p.created_at at time zone 'Asia/Manila')::date = d::date)) order by d)
      from generate_series((now() at time zone 'Asia/Manila')::date - 6, (now() at time zone 'Asia/Manila')::date, interval '1 day') d
    )
  );
end;
$$;

revoke execute on function public.guard_profile() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.admin_report() from public, anon;
grant execute on function public.admin_report() to authenticated;

commit;
