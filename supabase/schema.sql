-- AI Career Agent — database setup. Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once.

-- One table holds everything as JSON documents, one row per item, owned by a user.
create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text        not null check (char_length(kind) between 1 and 40),
  id         text        not null check (char_length(id) between 1 and 120),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists docs_user_updated_idx on public.docs (user_id, updated_at);

-- Row-level security: each signed-in user can only see and change their own rows.
alter table public.docs enable row level security;
drop policy if exists "Users manage their own rows" on public.docs;
create policy "Users manage their own rows" on public.docs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Visitors who are not signed in get nothing.
revoke all on public.docs from anon;
grant select, insert, update, delete on public.docs to authenticated;

-- The server clock stamps every change, so devices and the alert job can sync reliably.
create or replace function public.docs_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs
  for each row execute function public.docs_touch();

-- Check: should list one policy named "Users manage their own rows".
select policyname, cmd from pg_policies where tablename = 'docs';
