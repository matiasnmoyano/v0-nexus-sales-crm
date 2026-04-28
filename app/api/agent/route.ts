import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { sql, ensureSchema } from "@/lib/db"
import { getAgencyConfig } from "@/app/actions"

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

function buildSystemPrompt(agency: {
  name: string
  description: string
  services: Array<{ title: string; detail: string }>
  case_studies: Array<{ title: string; detail: string }>
  tone: string
}) {
  return `You are the senior sales analyst at ${agency.name}.

# Agency profile
${agency.description}

## Services we sell
${agency.services.map((s) => `- ${s.title}: ${s.detail}`).join("\n")}

## Case studies you can reference
${agency.case_studies.map((c) => `- ${c.title}: ${c.detail}`).join("\n")}

## Voice / tone
${agency.tone}

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

  // Drop scripts / styles / svgs entirely.
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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  await ensureSchema()
  const agency = await getAgencyConfig()

  const tools = {
    scrape_website: tool({
      description:
        "Fetch and extract the readable text of a public website. Use this whenever the user provides a URL.",
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
    }),

    save_analysis: tool({
      description:
        "Persist the final lead qualification + outreach drafts. Call this once, last.",
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

        const m = analysis.messages
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
            values (${lead.id}, ${row.channel}, ${row.type}, ${row.content})
            on conflict (lead_id, channel, type)
            do update set content = excluded.content
          `
        }

        return {
          ok: true,
          lead_id: lead.id,
          company_name: lead.company_name,
          lead_score: lead.lead_score,
          suggested_solution: lead.suggested_solution,
        }
      },
    }),
  }

  const result = streamText({
    model: "anthropic/claude-opus-4.6",
    system: buildSystemPrompt(agency),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
  })

  return result.toUIMessageStreamResponse()
}
