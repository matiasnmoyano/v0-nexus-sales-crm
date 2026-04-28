import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { sql, ensureSchema } from "@/lib/db"
import { getAgencyConfig, getLead, listMessagesForLead } from "@/app/actions"

export const maxDuration = 60

const ANALYSIS_SCHEMA = z.object({
  company_name: z
    .string()
    .min(1)
    .describe("The official company name. Infer from the URL or homepage if not stated."),
  url: z.string().nullable().describe("Public website URL or null if unknown."),
  industry: z
    .string()
    .nullable()
    .describe("Short industry / sector label, e.g. 'Real estate', 'B2B SaaS', 'Logistics'."),
  detected_problems: z
    .array(
      z.object({
        title: z.string().describe("Short problem statement (max ~10 words)."),
        evidence: z.string().describe("One sentence of evidence from the scraped content."),
      }),
    )
    .min(1)
    .max(5)
    .describe("The most acute digital / operational pain points the agency could solve."),
  suggested_solution: z.enum(["automation", "custom_software"]),
  solution_justification: z
    .string()
    .describe("Two to three sentences justifying the chosen solution category."),
  lead_score: z.number().int().min(0).max(100),
  score_breakdown: z.object({
    digital_pain: z.number().int().min(0).max(100),
    buying_capacity: z.number().int().min(0).max(100),
    service_fit: z.number().int().min(0).max(100),
    reason: z.string(),
  }),
  messages: z.object({
    email_initial: z.string(),
    email_d3: z.string(),
    email_d7: z.string(),
    linkedin_initial: z.string(),
    whatsapp_initial: z.string(),
  }),
})

type AnalysisInput = z.infer<typeof ANALYSIS_SCHEMA>
type AgentLocale = "es" | "en"

function languageInstructions(locale: AgentLocale) {
  if (locale === "es") {
    return `# Idioma
RESPONDÉ ÍNTEGRAMENTE EN ESPAÑOL RIOPLATENSE. Todos los problemas detectados, justificaciones, razonamiento en prosa y los borradores de outreach (email, LinkedIn, WhatsApp) deben estar escritos en español. No mezcles inglés excepto para nombres propios o términos técnicos sin traducción natural.`
  }
  return `# Language
RESPOND ENTIRELY IN ENGLISH. All detected problems, justifications, reasoning prose, and outreach drafts (email, LinkedIn, WhatsApp) must be written in English. Do not mix Spanish except for proper nouns or technical terms with no natural translation.`
}

interface RefineContext {
  leadId: string
  lead: Awaited<ReturnType<typeof getLead>>
  drafts: Awaited<ReturnType<typeof listMessagesForLead>>
}

function buildSystemPrompt(
  agency: {
    name: string
    description: string
    services: Array<{ title: string; detail: string }>
    case_studies: Array<{ title: string; detail: string }>
    tone: string
  },
  locale: AgentLocale,
  refine: RefineContext | null,
) {
  const base = `You are the senior sales analyst at ${agency.name}.

${languageInstructions(locale)}

# Agency profile
${agency.description}

## Services we sell
${agency.services.map((s) => `- ${s.title}: ${s.detail}`).join("\n")}

## Case studies you can reference
${agency.case_studies.map((c) => `- ${c.title}: ${c.detail}`).join("\n")}

## Voice / tone
${agency.tone}`

  // ---- New-lead flow --------------------------------------------------
  if (!refine || !refine.lead) {
    return `${base}

# Your job
Given a lead (a website URL or a free-text description) you must:

1. If a URL is given, call the \`scrape_website\` tool first.
2. Think out loud (in plain prose) about the company:
   - what they do, the digital maturity you can see, friction points a visitor would hit, and which of the agency's services match.
3. Decide a single \`suggested_solution\` ("automation" or "custom_software"):
   - "automation" → repetitive customer-support, lead-qualification, ops-flow, WhatsApp / chat workflows.
   - "custom_software" → bespoke dashboards, internal tools, integrations with APIs / ERPs, customer-facing platforms.
4. Score the lead 0-100 weighing three sub-scores (also 0-100):
   - digital_pain — how visible & acute the digital / operational pain is.
   - buying_capacity — apparent size, professionalism, paid tooling, hiring signals.
   - service_fit — how cleanly our two service lines actually solve their problem.
   The final \`lead_score\` must be a sensible weighted blend of the three.
5. Draft outreach in the agency's voice:
   - \`email_initial\`: ~120 words, references one concrete observation, ends with a soft CTA (15-min call).
   - \`email_d3\`: short follow-up (~60 words), adds value (e.g. a tip or relevant case-study link).
   - \`email_d7\`: very short break-up follow-up (~40 words).
   - \`linkedin_initial\`: <300 chars, conversational, no link.
   - \`whatsapp_initial\`: <250 chars, casual but professional, mention you saw their site.
   Match the agency tone exactly. Never invent metrics, never lie.
6. Finally, call the \`save_analysis\` tool **exactly once** with the full structured payload. Do not write more prose after the tool call.

# Hard rules
- Reasoning before tool calls is encouraged; reasoning after \`save_analysis\` is forbidden.
- Never fabricate scraped content. If \`scrape_website\` fails, say so and proceed with whatever the user described.
- Keep prose tight, no marketing fluff, no bullet-point spam.`
  }

  // ---- Refinement flow ------------------------------------------------
  const lead = refine.lead
  const draftBlock = refine.drafts
    .map((d) => `### ${d.channel} · ${d.type}\n${d.content}`)
    .join("\n\n")

  return `${base}

# Refinement mode
You are refining an EXISTING lead with the user. The user will tell you what they want to change ("make it more casual", "lower the score, the industry isn't ours", "change the email opener", etc).

## Current state of the lead
- Company: ${lead.company_name}
- URL: ${lead.url ?? "—"}
- Industry: ${lead.industry ?? "—"}
- Suggested solution: ${lead.suggested_solution}
- Lead score: ${lead.lead_score}
  - digital_pain: ${lead.score_breakdown?.digital_pain ?? "—"}
  - buying_capacity: ${lead.score_breakdown?.buying_capacity ?? "—"}
  - service_fit: ${lead.score_breakdown?.service_fit ?? "—"}

### Detected problems
${(lead.detected_problems ?? []).map((p) => `- **${p.title}** — ${p.evidence}`).join("\n") || "—"}

### Score reasoning
${lead.score_breakdown?.reason ?? "—"}

### Solution justification
${lead.solution_justification}

### Current outreach drafts
${draftBlock || "—"}

# How to work
1. Briefly acknowledge the change requested in 1-2 sentences (in plain prose).
2. If — and only if — the user wants you to look at the website again (e.g. "re-check their pricing page"), you MAY call \`scrape_website\`. Otherwise DO NOT scrape.
3. Re-think the analysis HOLISTICALLY. The user might ask to change one thing, but if that change implies others (e.g. lowering the score affects the email tone), update those too.
4. Call the \`refine_lead\` tool **exactly once** with the FULL updated payload. Keep unchanged fields identical to the current state above. Do not call \`save_analysis\` — that tool is disabled in refinement mode.
5. Do not write prose after the tool call.

# Hard rules
- Always return the FULL structured analysis to \`refine_lead\`, even if only one field changed. Never partial.
- Match the agency tone exactly.
- Never invent metrics. If lowering buying_capacity, justify it from observable evidence.`
}

async function scrapeWebsite(rawUrl: string): Promise<{
  url: string
  title: string
  description: string
  text: string
  status: number
}> {
  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NexusSalesBot/1.0; +https://nexus-sales.example)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  })

  const html = await res.text()

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")

  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const descMatch =
    cleaned.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    cleaned.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)

  const text = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()

  return {
    url: res.url || url,
    title: (titleMatch?.[1] || "").trim().slice(0, 200),
    description: (descMatch?.[1] || "").trim().slice(0, 400),
    text: text.slice(0, 6000),
    status: res.status,
  }
}

/**
 * Persist outreach drafts and (insert or update) the lead row.
 * Used by both `save_analysis` (insert) and `refine_lead` (update).
 */
async function writeOutreachMessages(leadId: string, m: AnalysisInput["messages"]) {
  const inserts: Array<{ channel: string; type: string; content: string }> = [
    { channel: "email", type: "initial", content: m.email_initial },
    { channel: "email", type: "followup_d3", content: m.email_d3 },
    { channel: "email", type: "followup_d7", content: m.email_d7 },
    { channel: "linkedin", type: "initial", content: m.linkedin_initial },
    { channel: "whatsapp", type: "initial", content: m.whatsapp_initial },
  ]
  for (const row of inserts) {
    await sql`
      insert into messages (lead_id, channel, type, content)
      values (${leadId}, ${row.channel}, ${row.type}, ${row.content})
      on conflict (lead_id, channel, type)
      do update set content = excluded.content, created_at = now()
    `
  }
}

export async function POST(req: Request) {
  const body: { messages: UIMessage[]; locale?: string; leadId?: string } = await req.json()
  const { messages } = body
  const locale: AgentLocale = body.locale === "en" ? "en" : "es"
  const incomingLeadId = typeof body.leadId === "string" && body.leadId.length > 0 ? body.leadId : null

  await ensureSchema()
  const agency = await getAgencyConfig()

  // If the client says we're refining an existing lead, hydrate its current
  // state so the system prompt can ground the LLM.
  let refineCtx: RefineContext | null = null
  if (incomingLeadId) {
    const lead = await getLead(incomingLeadId)
    if (lead) {
      const drafts = await listMessagesForLead(incomingLeadId)
      refineCtx = { leadId: incomingLeadId, lead, drafts }
    }
  }

  // Track the lead id this turn ends up bound to. Starts as the refine
  // target (if any) and gets overwritten by `save_analysis` when a brand
  // new lead is created.
  let boundLeadId: string | null = refineCtx?.leadId ?? null

  // Build the right toolset for the mode. Switching tools (instead of
  // gating with prose) prevents the model from accidentally creating a
  // duplicate lead during a refinement turn.
  const scrapeTool = tool({
    description:
      "Fetch and extract the readable text of a public website. Use this whenever the user provides a URL or asks you to re-read the lead's site.",
    inputSchema: z.object({
      url: z.string().describe("Full URL of the lead's website."),
    }),
    execute: async ({ url }) => {
      try {
        const data = await scrapeWebsite(url)
        return {
          ok: true,
          url: data.url,
          status: data.status,
          title: data.title,
          description: data.description,
          text: data.text,
          chars: data.text.length,
        }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "scrape failed",
          url,
        }
      }
    },
  })

  const saveTool = tool({
    description: "Persist the final lead qualification + outreach drafts. Call this once, last.",
    inputSchema: ANALYSIS_SCHEMA,
    execute: async (analysis) => {
      const [lead] = (await sql`
        insert into leads (
          company_name, url, industry, detected_problems,
          suggested_solution, solution_justification,
          lead_score, score_breakdown, status
        ) values (
          ${analysis.company_name},
          ${analysis.url},
          ${analysis.industry},
          ${JSON.stringify(analysis.detected_problems)}::jsonb,
          ${analysis.suggested_solution},
          ${analysis.solution_justification},
          ${analysis.lead_score},
          ${JSON.stringify(analysis.score_breakdown)}::jsonb,
          'analyzed'
        )
        returning id, company_name, lead_score, suggested_solution
      `) as Array<{
        id: string
        company_name: string
        lead_score: number
        suggested_solution: string
      }>

      await writeOutreachMessages(lead.id, analysis.messages)
      boundLeadId = lead.id

      return {
        ok: true,
        lead_id: lead.id,
        company_name: lead.company_name,
        lead_score: lead.lead_score,
        suggested_solution: lead.suggested_solution,
        mode: "created" as const,
      }
    },
  })

  const refineTool = tool({
    description:
      "Update the active lead with a refined analysis. The active lead id is implicit in the conversation context — you do not pass it. Call this exactly once at the end of a refinement turn.",
    inputSchema: ANALYSIS_SCHEMA,
    execute: async (analysis) => {
      if (!refineCtx) {
        return { ok: false, error: "No active lead in refinement context.", mode: "refused" as const }
      }
      const [lead] = (await sql`
        update leads set
          company_name = ${analysis.company_name},
          url = ${analysis.url},
          industry = ${analysis.industry},
          detected_problems = ${JSON.stringify(analysis.detected_problems)}::jsonb,
          suggested_solution = ${analysis.suggested_solution},
          solution_justification = ${analysis.solution_justification},
          lead_score = ${analysis.lead_score},
          score_breakdown = ${JSON.stringify(analysis.score_breakdown)}::jsonb,
          updated_at = now()
        where id = ${refineCtx.leadId}
        returning id, company_name, lead_score, suggested_solution
      `) as Array<{
        id: string
        company_name: string
        lead_score: number
        suggested_solution: string
      }>

      await writeOutreachMessages(lead.id, analysis.messages)
      boundLeadId = lead.id

      return {
        ok: true,
        lead_id: lead.id,
        company_name: lead.company_name,
        lead_score: lead.lead_score,
        suggested_solution: lead.suggested_solution,
        mode: "refined" as const,
      }
    },
  })

  // Mode-specific toolset: never expose `save_analysis` while refining,
  // and never expose `refine_lead` outside of refinement mode.
  const tools = refineCtx
    ? { scrape_website: scrapeTool, refine_lead: refineTool }
    : { scrape_website: scrapeTool, save_analysis: saveTool }

  const model = process.env.NEXUS_MODEL || "openai/gpt-5-mini"

  const result = streamText({
    model,
    system: buildSystemPrompt(agency, locale, refineCtx),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      // Only persist once we know which lead this thread belongs to.
      // For new-lead flows that's the lead returned by `save_analysis`;
      // for refinement flows we already had it from the request body.
      if (!boundLeadId) return
      try {
        for (const m of finalMessages) {
          // Only persist user/assistant turns. system messages (if any) are
          // server-side only and would corrupt the UIMessage list on reload.
          if (m.role !== "user" && m.role !== "assistant") continue
          await sql`
            insert into chat_messages (id, lead_id, role, parts)
            values (${m.id}, ${boundLeadId}, ${m.role}, ${JSON.stringify(m.parts ?? [])}::jsonb)
            on conflict (id) do update set
              parts = excluded.parts,
              role = excluded.role
          `
        }
      } catch (err) {
        // Persistence failures should never break the UI stream — log and move on.
        console.log("[v0] chat persistence error:", err instanceof Error ? err.message : err)
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.log("[v0] agent stream error:", message)
      if (/restricted|credits|abuse/i.test(message)) {
        return "The Vercel AI Gateway rejected the request: free credits are temporarily restricted on this project. Add paid credits at vercel.com → AI Gateway, or set NEXUS_MODEL to a model your key can use."
      }
      if (/AI_GATEWAY_API_KEY|authentication/i.test(message)) {
        return "AI_GATEWAY_API_KEY is missing or invalid. Add it in Project → Settings → Environment Variables."
      }
      return `Agent error: ${message}`
    },
  })
}
