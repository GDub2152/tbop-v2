
-- ================================================================
-- THE BLOWTORCH OF PARMA - TBOP v2 SUPABASE SETUP
-- Run this entire file ONCE in Supabase -> SQL Editor.
-- Safe to rerun: most objects use IF NOT EXISTS / OR REPLACE.
-- ================================================================

create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'Admin',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER avoids recursive RLS checks on site_admins.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_admins
    where user_id = auth.uid() and active = true
  );
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Other',
  description text,
  file_url text not null,
  storage_path text not null unique,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  callsign text,
  email text,
  phone text,
  status text not null default 'Active',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;
alter table public.documents enable row level security;
alter table public.news enable row level security;
alter table public.events enable row level security;
alter table public.members enable row level security;

-- Cleanly recreate policies.
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname='public' and tablename in ('site_admins','documents','news','events','members') loop
    execute format('drop policy if exists %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;

-- Public reads.
create policy "Public read published documents" on public.documents for select to anon, authenticated using (published = true or public.is_site_admin());
create policy "Public read published news" on public.news for select to anon, authenticated using (published = true or public.is_site_admin());
create policy "Public read events" on public.events for select to anon, authenticated using (true);

-- Admin CRUD.
create policy "Admins manage documents" on public.documents for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "Admins manage news" on public.news for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "Admins manage events" on public.events for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "Admins manage members" on public.members for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "Admins view admin list" on public.site_admins for select to authenticated using (public.is_site_admin());
create policy "Admins add admins" on public.site_admins for insert to authenticated with check (public.is_site_admin());
create policy "Admins update admins" on public.site_admins for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
create policy "Admins remove admins" on public.site_admins for delete to authenticated using (public.is_site_admin());

-- API privileges (RLS still controls rows).
grant select on public.documents, public.news, public.events to anon;
grant select, insert, update, delete on public.documents, public.news, public.events, public.members, public.site_admins to authenticated;

-- Public PDF bucket. Public visitors can read PDFs by public URL; only admins upload/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-documents','club-documents',true,26214400,array['application/pdf'])
on conflict (id) do update set public=true, file_size_limit=26214400, allowed_mime_types=array['application/pdf'];

drop policy if exists "TBOP admins upload PDFs" on storage.objects;
drop policy if exists "TBOP admins update PDFs" on storage.objects;
drop policy if exists "TBOP admins delete PDFs" on storage.objects;
create policy "TBOP admins upload PDFs" on storage.objects for insert to authenticated with check (bucket_id='club-documents' and public.is_site_admin());
create policy "TBOP admins update PDFs" on storage.objects for update to authenticated using (bucket_id='club-documents' and public.is_site_admin()) with check (bucket_id='club-documents' and public.is_site_admin());
create policy "TBOP admins delete PDFs" on storage.objects for delete to authenticated using (bucket_id='club-documents' and public.is_site_admin());

-- ================================================================
-- FIRST ADMIN BOOTSTRAP
-- 1) Supabase Dashboard -> Authentication -> Users -> Add user.
-- 2) Copy that user's UUID.
-- 3) Replace UUID-BELOW and run the INSERT separately.
-- ================================================================
-- insert into public.site_admins (user_id, name, role)
-- values ('UUID-BELOW', 'Greg', 'Secretary')
-- on conflict (user_id) do update set active=true;
