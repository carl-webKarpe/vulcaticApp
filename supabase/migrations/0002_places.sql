-- Vulcatic map: vulcanizing shops and mobile Vulcators (Siargao Island)
-- Run this once in Supabase: SQL Editor → New query → paste → Run.

-- ─── Admins: only people in this table can add / edit / delete map pins ─────
-- There is no insert policy, so nobody can make themselves admin from the app.
-- Add an admin from the SQL Editor (see the bottom of this file).
create table public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "users can see if they are admin"
  on public.admins for select to authenticated using ((select auth.uid()) = user_id);

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ─── Places on the map ──────────────────────────────────────────────────────
create table public.places (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) between 2 and 80),
  kind         text not null check (kind in ('shop', 'vulcator')),  -- shop = fixed place, vulcator = mobile, comes to you
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  address      text check (char_length(address) <= 160),
  phone        text check (char_length(phone) <= 30),
  hours        text check (char_length(hours) <= 60),
  description  text check (char_length(description) <= 500),
  is_demo      boolean not null default false,
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger places_touch_updated_at
  before update on public.places
  for each row execute function public.touch_updated_at();

alter table public.places enable row level security;

create policy "places are readable by signed-in users"
  on public.places for select to authenticated using (true);
create policy "admins add places"
  on public.places for insert to authenticated with check ((select public.is_admin()));
create policy "admins update places"
  on public.places for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete places"
  on public.places for delete to authenticated using ((select public.is_admin()));

-- Live updates: the map refreshes by itself when a pin is added, moved or removed.
alter publication supabase_realtime add table public.places;

-- ─── Demo pins around Siargao (made-up businesses, shown with a DEMO badge) ─
-- Delete them later with:  delete from public.places where is_demo;
insert into public.places (name, kind, lat, lng, address, phone, hours, description, is_demo) values
  ('Tropa Tire Vulcanizing',      'shop',     9.7868, 126.1569, 'Tourism Rd, General Luna',      '0917 000 0001', '7:00 AM – 8:00 PM', 'Flat tire repair, tire patching and air for motorbikes and tricycles.', true),
  ('Cloud 9 Road Vulcanizing',    'shop',     9.8098, 126.1597, 'Catangnan, General Luna',       '0917 000 0002', '6:00 AM – 9:00 PM', 'Motorbike tires, inner tubes and quick patching.', true),
  ('Dapa Port Vulcanizing',       'shop',     9.7598, 126.0518, 'Near Dapa Port, Dapa',          '0917 000 0003', '5:00 AM – 7:00 PM', 'Car, van and motorbike tires. Open early for the first ferry.', true),
  ('Del Carmen Tire & Vulcanize', 'shop',     9.8687, 126.0172, 'Poblacion, Del Carmen',         '0917 000 0004', '7:00 AM – 6:00 PM', 'Vulcanizing, tire change and wheel balancing.', true),
  ('Pilar Vulcanizing Shop',      'shop',     9.8643, 126.1003, 'Poblacion, Pilar',              '0917 000 0005', '7:00 AM – 6:00 PM', 'Tire patching and spare inner tubes.', true),
  ('Burgos Roadside Vulcanizing', 'shop',    10.0108, 126.0731, 'National Rd, Burgos',           '0917 000 0006', '6:00 AM – 7:00 PM', 'Motorbike and tricycle tires.', true),
  ('Kuya Jun Mobile Vulcanizing', 'vulcator', 9.7765, 126.1105, 'Covers General Luna & Union',   '0917 000 0011', '24/7 on call',      'Comes to you anywhere on the road with tools and a pump.', true),
  ('Island Rider Tire Rescue',    'vulcator', 9.9560, 126.0882, 'Covers San Isidro & Pacifico',  '0917 000 0012', '6:00 AM – 10:00 PM', 'Mobile flat tire help for motorbikes. Text or call.', true),
  ('North Siargao Mobile Vulcan', 'vulcator',10.0212, 126.0398, 'Covers Santa Monica & Burgos',  '0917 000 0013', '7:00 AM – 7:00 PM', 'Roadside tire repair in the north of the island.', true),
  ('Dapa–Del Carmen Tire Help',   'vulcator', 9.8150, 126.0350, 'Covers Dapa & Del Carmen',      '0917 000 0014', '24/7 on call',      'Mobile vulcanizer for motorbikes, vans and cars.', true);

-- ─── Make yourself admin ────────────────────────────────────────────────────
-- Replace carl with YOUR username from the app, then run just this line:
--   insert into public.admins (user_id) select id from public.profiles where username = 'carl';
