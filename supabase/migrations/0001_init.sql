-- Vulcatic database schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ─── Profiles: one row per user ──────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Automatically create a profile when someone signs up.
-- The username comes from the sign-up form (options.data.username).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Posts ───────────────────────────────────────────────────────────────────
create table public.posts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  caption     text check (char_length(caption) <= 500),
  image_path  text,
  created_at  timestamptz not null default now(),
  constraint post_not_empty check (caption is not null or image_path is not null)
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_id_idx on public.posts (user_id);

-- ─── Likes ───────────────────────────────────────────────────────────────────
create table public.likes (
  post_id     bigint not null references public.posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index likes_user_id_idx on public.likes (user_id);

-- ─── Row Level Security: who can read/write what ────────────────────────────
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;

-- Profiles: any signed-in user can see profiles; you can only edit your own.
create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated using (true);
create policy "users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Posts: signed-in users see all posts; you can only create/edit/delete your own.
create policy "posts are readable by signed-in users"
  on public.posts for select to authenticated using (true);
create policy "users create own posts"
  on public.posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own posts"
  on public.posts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own posts"
  on public.posts for delete to authenticated using ((select auth.uid()) = user_id);

-- Likes: signed-in users see all likes; you can only like/unlike as yourself.
create policy "likes are readable by signed-in users"
  on public.likes for select to authenticated using (true);
create policy "users like as themselves"
  on public.likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users remove own likes"
  on public.likes for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── Storage: bucket for post photos ────────────────────────────────────────
-- Public bucket so images load by URL; uploads go into a folder named after the user's id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "users upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
