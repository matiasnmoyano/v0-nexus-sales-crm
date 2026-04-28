import "server-only"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

let _sql: NeonQueryFunction<false, false> | null = null

function getClient(): NeonQueryFunction<false, false> {
  if (_sql) return _sql
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Connect Neon to the project.")
  }
  _sql = neon(connectionString)
  return _sql
}

// Proxy that defers client creation until the first query — keeps module
// imports cheap and avoids hard failures during build / when env is missing.
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, argArray) {
    const fn = getClient() as unknown as (...args: unknown[]) => unknown
    return fn.apply(_thisArg, argArray)
  },
  get(_target, prop, receiver) {
    const client = getClient() as unknown as Record<string, unknown>
    const value = client[prop as string]
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
}) as NeonQueryFunction<false, false>

let schemaPromise: Promise<void> | null = null

/**
 * Ensure the Nexus schema exists. Idempotent and memoised — safe to call
 * from any server action / route handler before reading or writing.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`create extension if not exists "pgcrypto"`

      await sql`
        create table if not exists agency_config (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          description text not null,
          services jsonb not null default '[]'::jsonb,
          case_studies jsonb not null default '[]'::jsonb,
          tone text not null,
          updated_at timestamptz not null default now()
        )
      `

      await sql`
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
        )
      `

      await sql`create index if not exists idx_leads_status on leads(status)`
      await sql`create index if not exists idx_leads_created on leads(created_at desc)`

      await sql`
        create table if not exists messages (
          id uuid primary key default gen_random_uuid(),
          lead_id uuid not null references leads(id) on delete cascade,
          channel text not null check (channel in ('email','linkedin','whatsapp')),
          type text not null check (type in ('initial','followup_d3','followup_d7')),
          content text not null,
          created_at timestamptz not null default now(),
          unique (lead_id, channel, type)
        )
      `

      await sql`create index if not exists idx_messages_lead on messages(lead_id)`

      // Seed the default agency profile only when the table is empty.
      await sql`
        insert into agency_config (name, description, services, case_studies, tone)
        select
          'Nexus Labs',
          'Argentinian software & automation studio. We help companies digitise processes and automate customer support with measurable ROI.',
          '[
            {"title":"Custom software","detail":"Web platforms, dashboards and API/ERP integrations built on Next.js and Node."},
            {"title":"Automation","detail":"WhatsApp bots, AI agents and n8n workflows for support and internal ops."}
          ]'::jsonb,
          '[
            {"title":"WhatsApp bot for a real-estate agency","detail":"Automated 70% of first-touch enquiries and freed up the sales team."},
            {"title":"Operations dashboard for a distributor","detail":"Replaced three Excel sheets and cut stock errors in half."}
          ]'::jsonb,
          'Direct but technical. No fluff, focus on measurable ROI.'
        where not exists (select 1 from agency_config)
      `
    })().catch((err) => {
      // Reset so a future call can retry after a transient failure.
      schemaPromise = null
      throw err
    })
  }
  return schemaPromise
}
