-- Z10 CRM - estrutura complementar para Configuracoes v2
-- Execute uma vez no SQL Editor do projeto Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  timezone text not null default 'America/Sao_Paulo',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade com projetos que já possuem uma tabela profiles parcial.
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.memberships
  add column if not exists role text not null default 'member';

create table if not exists public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  legal_name text,
  phone text,
  email text,
  segment text,
  segment_detail text,
  timezone text not null default 'America/Sao_Paulo',
  country text not null default 'Brasil',
  document text,
  postal_code text,
  address text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  logo_url text,
  updated_at timestamptz not null default now()
);

-- Compatibilidade com projetos que já possuem uma tabela tenant_settings parcial.
alter table public.tenant_settings
  add column if not exists legal_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists segment text,
  add column if not exists segment_detail text,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists country text not null default 'Brasil',
  add column if not exists document text,
  add column if not exists postal_code text,
  add column if not exists address text,
  add column if not exists number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists logo_url text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#7dd3fc',
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- Compatibilidade com projetos que já possuem uma tabela tags parcial.
alter table public.tags
  add column if not exists description text,
  add column if not exists color text not null default '#7dd3fc',
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists tags_tenant_id_name_key
  on public.tags (tenant_id, name);

create or replace function public.z10_is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.active = true
  );
$$;

create or replace function public.z10_shares_tenant(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships current_member
    join public.memberships target_member
      on target_member.tenant_id = current_member.tenant_id
    where current_member.user_id = auth.uid()
      and current_member.active = true
      and target_member.user_id = target_user
      and target_member.active = true
  );
$$;

grant execute on function public.z10_is_tenant_member(uuid) to authenticated;
grant execute on function public.z10_shares_tenant(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.tags enable row level security;

drop policy if exists "z10_profiles_select" on public.profiles;
create policy "z10_profiles_select"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.z10_shares_tenant(id));

drop policy if exists "z10_profiles_update_own" on public.profiles;
create policy "z10_profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "z10_tenant_settings_select" on public.tenant_settings;
create policy "z10_tenant_settings_select"
on public.tenant_settings for select
to authenticated
using (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_tenant_settings_insert" on public.tenant_settings;
create policy "z10_tenant_settings_insert"
on public.tenant_settings for insert
to authenticated
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_tenant_settings_update" on public.tenant_settings;
create policy "z10_tenant_settings_update"
on public.tenant_settings for update
to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_tags_select" on public.tags;
create policy "z10_tags_select"
on public.tags for select
to authenticated
using (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_tags_insert" on public.tags;
create policy "z10_tags_insert"
on public.tags for insert
to authenticated
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_tags_update" on public.tags;
create policy "z10_tags_update"
on public.tags for update
to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_tags_delete" on public.tags;
create policy "z10_tags_delete"
on public.tags for delete
to authenticated
using (public.z10_is_tenant_member(tenant_id));

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.tenant_settings to authenticated;
grant select, insert, update, delete on public.tags to authenticated;

create or replace function public.z10_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists z10_on_auth_user_created on auth.users;
create trigger z10_on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.z10_handle_new_user();

insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  email
from auth.users
on conflict (id) do nothing;

insert into public.tenant_settings (tenant_id, legal_name)
select id, name from public.tenants
on conflict (tenant_id) do nothing;

insert into public.tags (tenant_id, name, color)
select tenant.id, seed.name, seed.color
from public.tenants tenant
cross join (
  values
    ('Concluído', '#4ade80'),
    ('Follow-up', '#fb923c'),
    ('Importante', '#fda4af'),
    ('Novo', '#7dd3fc')
) as seed(name, color)
on conflict (tenant_id, name) do nothing;
