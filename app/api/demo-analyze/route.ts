import { generateText, Output } from "ai"
import { z } from "zod"
import { callerKey, checkRateLimit } from "@/lib/rate-limit"

/**
 * Public hero demo endpoint.
 *
 * - Streams typed phase events over SSE so the landing UI can light up its
 *   stepper in real time without speaking the AI SDK chat protocol.
 * - Rate limited to 3 calls / IP / hour. The dashboard endpoint
 *   (/api/agent) is the unrestricted version for authenticated use.
 * - Does NOT persist anything — the demo is stateless on purpose.
 */

export const maxDuration = 30

type DemoLocale = "es" | "en"

interface DemoBody {
  url?: string
  locale?: string
}

const ResultSchema = z.object({
  score: z.number().min(0).max(100).describe("Lead score 0-100 — how good a fit this prospect is."),
  solution: z
    .enum(["automation", "custom_software"])
    .describe("Which Nexus Sales offering best fits this prospect."),
  industry: z.string().describe("Concise industry description (max 6 words)."),
  problems: z
    .array(
      z.object({
        title: z.string().describe("Pain or opportunity in 6 words or less."),
        evidence: z
          .string()
          .describe("Concrete signal from the website that supports this — quote or paraphrase."),
      }),
    )
    .min(2)
    .max(3),
  copyPreview: z
    .string()
    .describe("First 3 lines of an outreach email — newline separated, no greeting fluff."),
})

function localizeRateLimit(locale: DemoLocale, retryAfterSec: number): string {
  const minutes = Math.ceil(retryAfterSec / 60)
  return locale === "es"
    ? `Demos disponibles agotadas. Volvé a probar en ${minutes} min, o abrí el dashboard para uso ilimitado.`
    : `Demo quota exhausted. Try again in ${minutes} min, or open the dashboard for unlimited runs.`
}

function buildSystem(locale: DemoLocale) {
  if (locale === "es") {
    return `Sos un analista senior de ventas B2B. Tu agencia ofrece dos servicios: AUTOMATION (workflows, integraciones, RPA, agentes IA) y CUSTOM_SOFTWARE (apps web, dashboards a medida, plataformas internas). Recibís el contenido scrapeado de un sitio y devolvés un análisis en español rioplatense, conciso y específico. Cero genéricos. La evidencia debe ser literal del contenido.`
  }
  return `You are a senior B2B sales analyst. Your agency offers two services: AUTOMATION (workflows, integrations, RPA, AI agents) and CUSTOM_SOFTWARE (web apps, bespoke dashboards, internal tools). Given scraped website content, return a tight, specific analysis in English. No generics. Evidence must come straight from the content.`
}

function normalizeUrl(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`
  try {
    const u = new URL(candidate)
    if (!u.hostname.includes(".")) return null
    return u.toString()
  } catch {
    return null
  }
}

async function fetchSiteText(url: string): Promise<{ text: string; title: string }> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; NexusSalesBot/1.0; +https://nexus-sales.app/bot)",
      accept: "text/html,application/xhtml+xml",
    },
    // Cap response size & time defensively
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    throw new Error(`Site returned ${res.status}`)
  }
  const html = await res.text()
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname
  // Strip script/style/nav and tags, collapse whitespace, cap at 6k chars.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000)
  return { text, title }
}

function sseEncode(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: Request) {
  const body: DemoBody = await req.json().catch(() => ({}))
  const locale: DemoLocale = body.locale === "en" ? "en" : "es"
  const url = normalizeUrl(body.url || "")

  if (!url) {
    return Response.json(
      { error: locale === "es" ? "URL inválida" : "Invalid URL" },
      { status: 400 },
    )
  }

  const ip = callerKey(req)
  const rl = checkRateLimit({ key: `demo:${ip}`, limit: 3, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) {
    return Response.json(
      { error: localizeRateLimit(locale, rl.retryAfter), code: "rate_limited" },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
    )
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(sseEncode(event, data))

      try {
        send("phase", { id: "search", status: "active" })
        await new Promise((r) => setTimeout(r, 250))
        send("phase", { id: "search", status: "done" })

        send("phase", { id: "scrape", status: "active" })
        const { text, title } = await fetchSiteText(url)
        send("phase", { id: "scrape", status: "done", title })

        send("phase", { id: "analyze", status: "active" })

        const model = process.env.NEXUS_MODEL || "openai/gpt-5-mini"
        const result = await generateText({
          model,
          system: buildSystem(locale),
          prompt: `Site: ${title}\nURL: ${url}\n\nContent (truncated):\n${text}\n\nAnalyse and return the structured object. Score 0-100 must reflect digital pain (40%) + buying capacity (30%) + service fit (30%). The 3-line copyPreview must reference at least one piece of evidence by name.`,
          experimental_output: Output.object({ schema: ResultSchema }),
        })

        send("phase", { id: "analyze", status: "done" })
        send("phase", { id: "score", status: "active" })
        await new Promise((r) => setTimeout(r, 200))
        send("phase", { id: "score", status: "done" })

        const parsed = result.experimental_output

        // Truncate the copy hard at 3 lines / ~280 chars to keep the demo small.
        const lines = parsed.copyPreview
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 3)
        const copyPreview = lines.join("\n").slice(0, 320)

        send("result", {
          ...parsed,
          copyPreview,
          truncated: true,
          remaining: rl.remaining,
          url,
          title,
        })
        send("done", {})
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const friendly =
          locale === "es"
            ? `No pude analizar este sitio (${message}). Probá con otra URL o abrí el dashboard.`
            : `Couldn't analyse this site (${message}). Try another URL or open the dashboard.`
        send("error", { message: friendly })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  })
}
