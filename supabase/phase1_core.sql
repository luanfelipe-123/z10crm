-- Z10 CRM - Fase 1 funcional
-- Pipelines ilimitados, Evolution/WhatsApp, automações e webhooks.
-- Execute no SQL Editor depois de settings_v2.sql.

create extension if not exists pgcrypto;

-- Compatibilidade das tabelas comerciais que já existem no projeto.
alter table public.pipelines
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.stages
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists color text not null default '#38bdf8',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.deals
  add column if not exists updated_at timestamptz not null default now();

update public.stages stage
set tenant_id = pipeline.tenant_id
from public.pipelines pipeline
where stage.pipeline_id = pipeline.id
  and stage.tenant_id is null;

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null default 'evolution',
  name text not null,
  instance_name text not null unique,
  status text not null default 'created',
  enabled boolean not null default true,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid references public.connections(id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  group_id uuid references public.automation_groups(id) on delete set null,
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null default 'none',
  action_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  webhook_token uuid not null default gen_random_uuid() unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  status text not null default 'running',
  trigger_payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists connections_tenant_id_idx on public.connections (tenant_id);
create index if not exists whatsapp_events_tenant_created_idx on public.whatsapp_events (tenant_id, created_at desc);
create index if not exists automations_tenant_trigger_idx on public.automations (tenant_id, trigger_type, enabled);
create index if not exists automation_executions_automation_started_idx on public.automation_executions (automation_id, started_at desc);

alter table public.connections enable row level security;
alter table public.whatsapp_events enable row level security;
alter table public.automation_groups enable row level security;
alter table public.automations enable row level security;
alter table public.automation_executions enable row level security;
alter table public.pipelines enable row level security;
alter table public.stages enable row level security;
alter table public.deals enable row level security;

drop policy if exists "z10_pipelines_all" on public.pipelines;
create policy "z10_pipelines_all" on public.pipelines for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_stages_all" on public.stages;
create policy "z10_stages_all" on public.stages for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_deals_all" on public.deals;
create policy "z10_deals_all" on public.deals for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_connections_all" on public.connections;
create policy "z10_connections_all" on public.connections for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_whatsapp_events_select" on public.whatsapp_events;
create policy "z10_whatsapp_events_select" on public.whatsapp_events for select to authenticated
using (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_automation_groups_all" on public.automation_groups;
create policy "z10_automation_groups_all" on public.automation_groups for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_automations_all" on public.automations;
create policy "z10_automations_all" on public.automations for all to authenticated
using (public.z10_is_tenant_member(tenant_id))
with check (public.z10_is_tenant_member(tenant_id));

drop policy if exists "z10_automation_executions_select" on public.automation_executions;
create policy "z10_automation_executions_select" on public.automation_executions for select to authenticated
using (public.z10_is_tenant_member(tenant_id));

grant select, insert, update, delete on public.connections to authenticated;
grant select on public.whatsapp_events to authenticated;
grant select, insert, update, delete on public.automation_groups to authenticated;
grant select, insert, update, delete on public.automations to authenticated;
grant select on public.automation_executions to authenticated;
grant select, insert, update, delete on public.pipelines to authenticated;
grant select, insert, update, delete on public.stages to authenticated;
grant select, insert, update, delete on public.deals to authenticated;

insert into public.automation_groups (tenant_id, name)
select id, 'Padrão' from public.tenants
on conflict (tenant_id, name) do nothing;
