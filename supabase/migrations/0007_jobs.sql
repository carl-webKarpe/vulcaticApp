-- Vulcatic 2.0.0: requests, jobs, earnings and ratings.
-- Adds one table and two read functions. Changes and deletes no existing rows.
-- Only the customer and the Vulcator/shop in a job can see it: there is no admin rule on purpose.
begin;

create table public.jobs (
  id            bigint generated always as identity primary key,
  customer_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  place_id      bigint references public.places (id) on delete set null,
  place_name    text not null,
  place_phone   text,
  service       text not null check (service in ('flat_tire', 'vulcanizing', 'replacement', 'air_refill', 'jump_start')),
  price         numeric(10, 2) not null check (price between 1 and 100000),
  vehicle       text not null check (vehicle in ('motorcycle', 'tricycle', 'car', 'van')),
  phone         text not null check (char_length(phone) <= 30 and length(regexp_replace(phone, '\D', '', 'g')) >= 7),
  note          text check (char_length(note) <= 200),
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  status        text not null default 'requested'
                check (status in ('requested', 'accepted', 'on_the_way', 'done', 'paid', 'declined', 'cancelled')),
  rating        smallint check (rating between 1 and 5),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  done_at       timestamptz,
  paid_at       timestamptz,
  check (customer_id <> owner_id)
);
create index jobs_owner_idx on public.jobs (owner_id, created_at desc);
create index jobs_customer_idx on public.jobs (customer_id, created_at desc);
create index jobs_place_idx on public.jobs (place_id);
-- One open request per customer, to stop spam.
create unique index jobs_one_open_per_customer on public.jobs (customer_id)
  where status in ('requested', 'accepted', 'on_the_way');

alter table public.jobs enable row level security;
create policy "both sides see their jobs"
  on public.jobs for select to authenticated
  using (customer_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy "customers send requests"
  on public.jobs for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "both sides update their jobs"
  on public.jobs for update to authenticated
  using (customer_id = (select auth.uid()) or owner_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()) or owner_id = (select auth.uid()));

-- The price comes from the shop, never from the phone, and each side can only make its own moves.
create function public.guard_job()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pl public.places;
  want_status text := new.status;
  want_rating smallint := new.rating;
begin
  if auth.uid() is null then return new; end if;  -- SQL editor

  if tg_op = 'INSERT' then
    select * into pl from public.places where id = new.place_id;
    if pl.id is null or not pl.approved or pl.is_demo or pl.owner_id is null then
      raise exception 'This place cannot take requests.';
    end if;
    if pl.is_open is not true or pl.updated_at < now() - interval '12 hours' then
      raise exception 'Not available right now. Please choose another one.';
    end if;
    if pl.prices -> new.service is null then
      raise exception 'This service is not offered here.';
    end if;
    new.customer_id = auth.uid();
    new.owner_id = pl.owner_id;
    new.place_name = pl.name;
    new.place_phone = pl.phone;
    new.price = (pl.prices ->> new.service)::numeric;
    new.status = 'requested';
    new.rating = null;
    new.created_at = now();
    new.responded_at = null;
    new.done_at = null;
    new.paid_at = null;
    return new;
  end if;

  new = old;
  if want_status <> old.status then
    if auth.uid() = old.customer_id and want_status = 'cancelled' and old.status in ('requested', 'accepted') then
      new.status = want_status;
    elsif auth.uid() = old.owner_id and (
      (old.status = 'requested' and want_status in ('accepted', 'declined'))
      or (old.status = 'accepted' and want_status in ('on_the_way', 'done', 'cancelled'))
      or (old.status = 'on_the_way' and want_status in ('done', 'cancelled'))
      or (old.status = 'done' and want_status = 'paid')
    ) then
      new.status = want_status;
      if old.status = 'requested' then new.responded_at = now(); end if;
      if want_status = 'done' then new.done_at = now(); end if;
      if want_status = 'paid' then new.paid_at = now(); end if;
    else
      raise exception 'This job was already changed. Please refresh.';
    end if;
  end if;
  if want_rating is distinct from old.rating then
    if auth.uid() = old.customer_id and old.rating is null and old.status in ('done', 'paid') then
      new.rating = want_rating;
    else
      raise exception 'This job cannot be rated.';
    end if;
  end if;
  return new;
end;
$$;
create trigger jobs_guard
  before insert or update on public.jobs
  for each row execute function public.guard_job();

-- Customers see the GCash number only after their request was accepted.
create function public.job_gcash(job bigint)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select d.gcash
  from public.jobs j join public.private_details d on d.user_id = j.owner_id
  where j.id = job and j.customer_id = auth.uid() and j.status in ('accepted', 'on_the_way', 'done');
$$;

-- Average stars per place, without showing who rated or any job.
create function public.place_ratings()
returns table (place_id bigint, stars numeric, ratings bigint)
language sql
stable
security definer set search_path = ''
as $$
  select j.place_id, round(avg(j.rating), 1), count(*)
  from public.jobs j join public.places p on p.id = j.place_id
  where j.rating is not null and p.approved
  group by j.place_id;
$$;

revoke execute on function public.guard_job() from public, anon, authenticated;
revoke execute on function public.job_gcash(bigint) from public, anon;
grant execute on function public.job_gcash(bigint) to authenticated;
revoke execute on function public.place_ratings() from public;
grant execute on function public.place_ratings() to anon, authenticated;

-- Live updates while the app is open.
alter publication supabase_realtime add table public.jobs;

commit;
