"use server"

import { revalidatePath } from "next/cache"
import { sql, ensureSchema } from "@/lib/db"
import type {
  AgencyCaseStudy,
  AgencyConfig,
  AgencyService,
  Channel,
  Lead,
  LeadStatus,
  Message,
  MessageType,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Agency config
// ---------------------------------------------------------------------------

export async function getAgencyConfig(): Promise<AgencyConfig> {
  await ensureSchema()
  const rows = (await sql`
    select id, name, description, services, case_studies, tone, updated_at
    from agency_config
    order by updated_at desc
    limit 1
  `) as Array<{
    id: string
    name: string
    description: string
    services: AgencyService[]
    case_studies: AgencyCaseStudy[]
    tone: string
    updated_at: string
  }>

  if (rows.length === 0) {
    throw new Error("Agency config not initialised")
  }
  return rows[0] as AgencyConfig
}

export async function updateAgencyConfig(input: {
  id: string
  name: string
  description: string
  services: AgencyService[]
  case_studies: AgencyCaseStudy[]
  tone: string
}): Promise<AgencyConfig> {
  await ensureSchema()

  const [row] = (await sql`
    update agency_config
    set
      name = ${input.name},
      description = ${input.description},
      services = ${JSON.stringify(input.services)}::jsonb,
      case_studies = ${JSON.stringify(input.case_studies)}::jsonb,
      tone = ${input.tone},
      updated_at = now()
    where id = ${input.id}
    returning id, name, description, services, case_studies, tone, updated_at
  `) as Array<AgencyConfig>

  revalidatePath("/")
  return row
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function listLeads(): Promise<Lead[]> {
  await ensureSchema()
  const rows = (await sql`
    select
      id, company_name, url, industry, detected_problems,
      suggested_solution, solution_justification,
      lead_score, score_breakdown, status, raw_scrape_data,
      created_at, updated_at
    from leads
    order by created_at desc
  `) as Lead[]
  return rows
}

export async function getLead(id: string): Promise<Lead | null> {
  await ensureSchema()
  const rows = (await sql`
    select
      id, company_name, url, industry, detected_problems,
      suggested_solution, solution_justification,
      lead_score, score_breakdown, status, raw_scrape_data,
      created_at, updated_at
    from leads
    where id = ${id}
  `) as Lead[]
  return rows[0] ?? null
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  await ensureSchema()
  const [row] = (await sql`
    update leads
    set status = ${status}, updated_at = now()
    where id = ${id}
    returning
      id, company_name, url, industry, detected_problems,
      suggested_solution, solution_justification,
      lead_score, score_breakdown, status, raw_scrape_data,
      created_at, updated_at
  `) as Lead[]
  revalidatePath("/")
  return row
}

export async function deleteLead(id: string): Promise<void> {
  await ensureSchema()
  await sql`delete from leads where id = ${id}`
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function listMessagesForLead(leadId: string): Promise<Message[]> {
  await ensureSchema()
  const rows = (await sql`
    select id, lead_id, channel, type, content, created_at
    from messages
    where lead_id = ${leadId}
    order by created_at asc
  `) as Message[]
  return rows
}

export async function upsertMessage(input: {
  lead_id: string
  channel: Channel
  type: MessageType
  content: string
}): Promise<Message> {
  await ensureSchema()
  const [row] = (await sql`
    insert into messages (lead_id, channel, type, content)
    values (${input.lead_id}, ${input.channel}, ${input.type}, ${input.content})
    on conflict (lead_id, channel, type)
    do update set content = excluded.content, created_at = now()
    returning id, lead_id, channel, type, content, created_at
  `) as Message[]
  revalidatePath("/")
  return row
}
