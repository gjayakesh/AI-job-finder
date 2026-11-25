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

-- Lets a signed-in user permanently delete their own account (Settings → Account & AI → Delete account).
-- It removes the login itself and every row in public.docs. It can only ever delete the caller's own account.
-- Supabase's advisor flags it as "Signed-In Users Can Execute SECURITY DEFINER Function". That is intended: the browser calls it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'You must be signed in to delete your account.' using errcode = '28000';
  end if;
  delete from public.docs where user_id = (select auth.uid());
  delete from auth.users where id = (select auth.uid());
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Check: should list one policy ("Users manage their own rows") and one function (delete_my_account).
select 'policy' as kind, policyname::text as name from pg_policies where tablename = 'docs'
union all
select 'function', proname::text from pg_proc where proname = 'delete_my_account' and pronamespace = 'public'::regnamespace;
