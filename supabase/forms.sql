-- Z10 CRM - módulo de Formulários
-- Execute este arquivo no SQL Editor do mesmo projeto Supabase usado pelo CRM.

create extension if not exists pgcrypto;

create table if not exists public.crm_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null default 'Novo formulário',
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.crm_forms(id) on delete cascade,
  field_type text not null,
  label text not null,
  placeholder text,
  help_text text,
  required boolean not null default false,
  position integer not null default 0,
  options jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.crm_forms(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crm_forms_tenant_idx on public.crm_forms(tenant_id, updated_at desc);
create index if not exists crm_form_fields_form_position_idx on public.crm_form_fields(form_id, position);
create index if not exists crm_form_submissions_form_created_idx on public.crm_form_submissions(form_id, created_at desc);

alter table public.crm_forms enable row level security;
alter table public.crm_form_fields enable row level security;
alter table public.crm_form_submissions enable row level security;

drop policy if exists "z10_crm_forms_all" on public.crm_forms;
create policy "z10_crm_forms_all" on public.crm_forms for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_crm_form_fields_all" on public.crm_form_fields;
create policy "z10_crm_form_fields_all" on public.crm_form_fields for all to authenticated
using (exists (select 1 from public.crm_forms f where f.id = form_id and public.z10_is_tenant_member(f.tenant_id)))
with check (exists (select 1 from public.crm_forms f where f.id = form_id and public.z10_is_tenant_member(f.tenant_id)));

drop policy if exists "z10_crm_form_submissions_select" on public.crm_form_submissions;
create policy "z10_crm_form_submissions_select" on public.crm_form_submissions for select to authenticated
using (public.z10_is_tenant_member(tenant_id));

grant select, insert, update, delete on public.crm_forms to authenticated;
grant select, insert, update, delete on public.crm_form_fields to authenticated;
grant select on public.crm_form_submissions to authenticated;
