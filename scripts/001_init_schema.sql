-- Nexus Sales: initial schema

create extension if not exists "pgcrypto";

-- agency_config: single-row table with the editable agency brief
create table if not exists agency_config (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  services jsonb not null default '[]'::jsonb,
  case_studies jsonb not null default '[]'::jsonb,
  tone text not null,
  updated_at timestamptz not null default now()
);

-- leads: companies analyzed by the agent
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  url text,
  industry text,
  detected_problems jsonb not null default '[]'::jsonb,
  suggested_solution text not null check (suggested_solution in ('automation','custom_software')),
  solution_justification text not null,
  lead_score integer not null check (lead_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'analyzed' check (status in ('analyzed','contacted','follow_up','meeting','discarded')),
  raw_scrape_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_created on leads(created_at desc);

-- messages: generated copy per lead, channel and follow-up phase
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null check (channel in ('email','linkedin','whatsapp')),
  type text not null check (type in ('initial','followup_d3','followup_d7')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (lead_id, channel, type)
);

create index if not exists idx_messages_lead on messages(lead_id);

-- Seed default agency config (Nexus Labs) only if empty
insert into agency_config (name, description, services, case_studies, tone)
select
  'Nexus Labs',
  'Agencia argentina de desarrollo de software y automatización. Ayudamos a empresas a digitalizar procesos y automatizar atención con foco en ROI medible.',
  '[
    {"title":"Software a medida","detail":"Plataformas web, dashboards e integraciones con APIs y ERPs en Next.js / Node."},
    {"title":"Automatizaciones","detail":"Bots de WhatsApp, agentes de IA y workflows con n8n para atención al cliente y procesos internos."}
  ]'::jsonb,
  '[
    {"title":"Bot de WhatsApp para inmobiliaria","detail":"Automatizó el 70% de las consultas iniciales y liberó al equipo comercial."},
    {"title":"Dashboard de gestión para distribuidora","detail":"Reemplazó 3 planillas de Excel y redujo errores de stock."}
  ]'::jsonb,
  'Cercano pero técnico, español rioplatense, sin vender humo, foco en ROI medible.'
where not exists (select 1 from agency_config);
