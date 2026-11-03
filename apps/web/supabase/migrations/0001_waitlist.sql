-- RED waitlist. Anonymous visitors can insert; nobody can read, update or delete through the API.
create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  created_at  timestamptz not null default now(),
  source      text not null default 'landing' check (source ~ '^[a-z0-9-]{1,64}$')
);

-- One row per address, case-insensitive. A duplicate insert returns 409 / 23505.
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon, authenticated;
grant insert (email, source) on table public.waitlist to anon;

drop policy if exists "anon can join the waitlist" on public.waitlist;
create policy "anon can join the waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);
