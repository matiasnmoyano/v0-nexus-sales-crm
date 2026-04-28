"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  Sparkles,
  Square,
  Trash,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { AgencyConfig, Lead, LeadStatus, SuggestedSolution } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getChatHistory, getRecentLeads } from "@/app/actions"

interface Props {
  agency: AgencyConfig
  /** Lead currently bound to the chat for refinement, or null for new-lead flow. */
  activeLead: Lead | null
  /** Pin / unpin a lead onto the Co-Pilot. */
  onActiveLeadChange: (id: string | null) => void
  /** Fired when the agent has either created or refined a lead in the DB. */
  onAnalysisSaved: (leadId: string, mode: "created" | "refined") => void
}

const EXAMPLES = [
  "https://www.notion.so",
  "https://www.linear.app",
  "https://www.attio.com",
]

interface UIPart {
  type: string
  text?: string
  state?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

type Phase = "thinking" | "reading" | "analyzing" | "drafting" | "saving" | "refining"

type RecentLead = Pick<Lead, "id" | "company_name" | "lead_score" | "suggested_solution" | "status">

/**
 * Inspect the latest assistant message to figure out what the agent is
 * doing right *now*. Drives the WorkingIndicator while streaming.
 *
 * Order of precedence (newest signals win):
 *   - refine_lead tool running         → "refining"
 *   - save_analysis tool running       → "saving"
 *   - scrape_website tool running      → "reading"
 *   - last completed part is scrape    → "analyzing" (LLM is reasoning post-scrape)
 *   - last part is text being streamed → "drafting"
 *   - no parts yet                     → "thinking"
 */
function derivePhase(messages: Array<{ role: string; parts?: UIPart[] }>): Phase {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== "assistant") continue
    const parts = m.parts ?? []
    if (parts.length === 0) return "thinking"
    const last = parts[parts.length - 1]
    if (last.type === "tool-refine_lead") return "refining"
    if (last.type === "tool-save_analysis") return "saving"
    if (last.type === "tool-scrape_website") {
      if (last.state === "output-available") return "analyzing"
      return "reading"
    }
    if (last.type === "text") return "drafting"
    return "thinking"
  }
  return "thinking"
}

export function CopilotPanel({
  agency,
  activeLead,
  onActiveLeadChange,
  onAnalysisSaved,
}: Props) {
  const t = useTranslations("copilot")
  const locale = useLocale()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastNotifiedRef = useRef<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  })

  // ---- Hydrate the thread when the active lead changes -----------------
  // We re-load chat history every time the bound lead changes. If the user
  // unpins (activeLead = null), we wipe the thread back to the empty state.
  useEffect(() => {
    let cancelled = false
    if (!activeLead) {
      setMessages([])
      lastNotifiedRef.current = null
      return
    }
    const targetId = activeLead.id
    setHistoryLoading(true)
    getChatHistory(targetId)
      .then((rows) => {
        if (cancelled) return
        // Reset the notify guard so we don't re-fire onAnalysisSaved for
        // existing tool results in the loaded history.
        lastNotifiedRef.current = targetId
        // Cast: server returns parts as `unknown[]` to keep types loose.
        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role,
            parts: r.parts as UIMessage["parts"],
          })) as UIMessage[],
        )
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeLead?.id, setMessages])

  // ---- Recent-leads chips for the empty state --------------------------
  useEffect(() => {
    if (activeLead || messages.length > 0) return
    let cancelled = false
    getRecentLeads(5).then((rows) => {
      if (!cancelled) setRecentLeads(rows)
    })
    return () => {
      cancelled = true
    }
  }, [activeLead, messages.length])

  // ---- Detect a successful save / refine and notify the parent ---------
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role !== "assistant" || !m.parts) continue
      for (const part of m.parts) {
        const p = part as UIPart & {
          output?: { ok?: boolean; lead_id?: string; mode?: "created" | "refined" }
          state?: string
        }
        const isSave = p.type === "tool-save_analysis" || p.type === "tool-refine_lead"
        if (!isSave || p.state !== "output-available") continue
        const out = p.output
        if (!out?.ok || !out.lead_id) continue
        // Use a composite key so a created lead followed by a refine both fire.
        const key = `${out.lead_id}:${out.mode ?? "created"}:${i}`
        if (lastNotifiedRef.current === key) continue
        lastNotifiedRef.current = key
        onAnalysisSaved(out.lead_id, out.mode === "refined" ? "refined" : "created")
      }
    }
  }, [messages, onAnalysisSaved])

  // ---- Auto-scroll while streaming -------------------------------------
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, status])

  const isStreaming = status === "streaming" || status === "submitted"
  const phase: Phase = isStreaming ? derivePhase(messages) : "thinking"

  const liveTextLocator = (() => {
    if (status !== "streaming") return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role !== "assistant" || !m.parts || m.parts.length === 0) continue
      const last = m.parts[m.parts.length - 1]
      if (last.type === "text") {
        return { messageId: (m as { id?: string }).id, partIndex: m.parts.length - 1 }
      }
      return null
    }
    return null
  })()

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    setInput("")
    // Pass the active lead id (if any) so the route switches into refinement
    // mode and grounds the system prompt in the lead's current state.
    sendMessage(
      { text },
      { body: { locale, leadId: activeLead?.id ?? null } },
    )
  }

  const handleClearThread = useCallback(() => {
    setMessages([])
    onActiveLeadChange(null)
    lastNotifiedRef.current = null
  }, [setMessages, onActiveLeadChange])

  const isRefining = !!activeLead

  return (
    <aside className="flex min-h-0 flex-col bg-sidebar/60">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Bot className="size-3.5 text-primary" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </span>
          {isStreaming && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              <span className="size-1 rounded-full bg-primary nexus-pulse-dot" />
              {t("live")}
            </span>
          )}
        </div>
        {(messages.length > 0 || activeLead) && !isStreaming && (
          <button
            type="button"
            onClick={handleClearThread}
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Trash className="size-3" />
            {t("clear")}
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="space-y-4 p-4 pb-2">
          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              <span className="font-mono">{t("loadingHistory")}</span>
            </div>
          ) : messages.length === 0 ? (
            <Welcome
              agency={agency}
              recentLeads={recentLeads}
              onPickExample={(s) => setInput(s)}
              onPickRecent={(id) => onActiveLeadChange(id)}
            />
          ) : (
            messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m as { id: string; role: string; parts?: UIPart[] }}
                liveTextLocator={liveTextLocator}
              />
            ))
          )}

          {isStreaming && phase !== "drafting" && <WorkingIndicator phase={phase} />}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              <span className="font-mono">{error.message}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border bg-card p-3">
        {activeLead && (
          <ActiveLeadChip
            lead={activeLead}
            onRemove={() => onActiveLeadChange(null)}
          />
        )}
        <div
          className={cn(
            "rounded-md border bg-background focus-within:border-primary/60",
            isRefining ? "border-primary/30" : "border-border",
          )}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={isRefining ? t("refinePlaceholder") : t("placeholder")}
            rows={2}
            className="block w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              {isRefining ? t("refineHint") : t("submitHint")}
            </span>
            {isStreaming ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => stop()}
                className="gap-1.5 font-mono text-xs"
              >
                <Square className="size-3" />
                {t("stop")}
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim()}
                className="gap-1.5 font-mono text-xs"
              >
                {isRefining ? <Wand2 className="size-3" /> : <ArrowUp className="size-3" />}
                {isRefining ? t("tools.refine") : t("analyze")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </aside>
  )
}

function ActiveLeadChip({
  lead,
  onRemove,
}: {
  lead: Lead
  onRemove: () => void
}) {
  const t = useTranslations("copilot.refineChip")
  return (
    <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
      <Wand2 className="size-3 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 font-mono text-[11px]">
        <span className="uppercase tracking-wider text-primary">{t("label")}</span>
        <span className="truncate text-foreground">· {lead.company_name}</span>
        <span className="shrink-0 text-muted-foreground">
          · {t("score", { score: lead.lead_score })}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("remove")}
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function WorkingIndicator({ phase }: { phase: Phase }) {
  const t = useTranslations("copilot.phases")
  const label = t(phase)
  return (
    <div
      className="flex items-center gap-2.5 rounded-md border border-border/60 bg-card/40 px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/40 nexus-pulse-dot" />
        <span className="size-1.5 rounded-full bg-primary" />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wider nexus-shimmer-text">
        {label}
      </span>
      {phase === "thinking" && (
        <span className="nexus-thinking-dots ml-auto" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
    </div>
  )
}

const STATUS_DOT: Record<LeadStatus, string> = {
  analyzed: "bg-primary",
  contacted: "bg-chart-2",
  follow_up: "bg-chart-3",
  meeting: "bg-success",
  discarded: "bg-muted-foreground/40",
}

const SOLUTION_LABEL_KEY: Record<SuggestedSolution, "automation" | "custom_software"> = {
  automation: "automation",
  custom_software: "custom_software",
}

function Welcome({
  agency,
  recentLeads,
  onPickExample,
  onPickRecent,
}: {
  agency: AgencyConfig
  recentLeads: RecentLead[]
  onPickExample: (text: string) => void
  onPickRecent: (id: string) => void
}) {
  const t = useTranslations("copilot")
  const tSolutions = useTranslations("solutions")
  return (
    <div className="space-y-4 py-2">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
            {t("briefingTitle")}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("briefingBody", { agencyName: agency.name })}
        </p>
      </div>

      {recentLeads.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("recent.title")}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {t("recent.subtitle")}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {recentLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => onPickRecent(lead.id)}
                className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent"
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[lead.status])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-foreground">{lead.company_name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {tSolutions(SOLUTION_LABEL_KEY[lead.suggested_solution])}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-mono text-xs tabular-nums",
                    lead.lead_score >= 70 ? "text-primary" : "text-foreground",
                  )}
                >
                  {lead.lead_score}
                </span>
                <Wand2 className="size-3 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("tryOne")}
        </span>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onPickExample(url)}
              className="group flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-xs">
                <Globe className="size-3 text-muted-foreground" />
                <span className="font-mono text-foreground">
                  {url.replace(/^https?:\/\//, "")}
                </span>
              </span>
              <ArrowUp className="size-3 -rotate-45 text-muted-foreground transition group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageItem({
  message,
  liveTextLocator,
}: {
  message: { id: string; role: string; parts?: UIPart[] }
  liveTextLocator: { messageId?: string; partIndex: number } | null
}) {
  if (message.role === "user") {
    const text =
      message.parts
        ?.filter((p): p is UIPart & { text: string } => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("") ?? ""
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-md rounded-tr-sm border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          <span className="whitespace-pre-wrap break-words">{text}</span>
        </div>
      </div>
    )
  }

  const parts = message.parts ?? []
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.type === "text") {
          const isLive =
            liveTextLocator !== null &&
            liveTextLocator.messageId === message.id &&
            liveTextLocator.partIndex === i
          return (
            <div
              key={i}
              className="rounded-md border border-border bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground"
            >
              <span className="whitespace-pre-wrap">{part.text}</span>
              {isLive && <span className="nexus-caret" aria-hidden="true" />}
            </div>
          )
        }
        if (part.type === "tool-scrape_website") {
          return <ScrapeToolPart key={i} part={part} />
        }
        if (part.type === "tool-save_analysis") {
          return <SaveToolPart key={i} part={part} mode="created" />
        }
        if (part.type === "tool-refine_lead") {
          return <SaveToolPart key={i} part={part} mode="refined" />
        }
        return null
      })}
    </div>
  )
}

function ToolShell({
  icon,
  label,
  state,
  children,
}: {
  icon: React.ReactNode
  label: string
  state: string | undefined
  children?: React.ReactNode
}) {
  const t = useTranslations("copilot.tools")
  const isError = state === "output-error"
  const isDone = state === "output-available"
  const isRunning = state === "input-streaming" || state === "input-available"
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border bg-card px-3 py-2.5",
        isError ? "border-destructive/40" : "border-border",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm",
          isError
            ? "bg-destructive/15 text-destructive"
            : isDone
              ? "bg-success/15 text-success"
              : "bg-primary/15 text-primary",
        )}
      >
        {isRunning ? (
          <Loader2 className="size-3 animate-spin" />
        ) : isDone ? (
          <CheckCircle2 className="size-3" />
        ) : isError ? (
          <TriangleAlert className="size-3" />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-wider",
              isRunning ? "text-foreground nexus-shimmer-text" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {isRunning ? t("running") : isDone ? t("done") : isError ? t("error") : ""}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function ScrapeToolPart({ part }: { part: UIPart }) {
  const t = useTranslations("copilot.tools")
  const input = part.input as { url?: string } | undefined
  const output = part.output as
    | { ok: boolean; url?: string; status?: number; title?: string; chars?: number; error?: string }
    | undefined

  return (
    <ToolShell icon={<Globe className="size-3" />} label={t("scrape")} state={part.state}>
      {input?.url && (
        <div className="truncate font-mono text-xs text-muted-foreground">
          → {input.url.replace(/^https?:\/\//, "")}
        </div>
      )}
      {output && (
        <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
          {output.ok ? (
            <>
              {output.title && <div className="truncate text-foreground">{output.title}</div>}
              <div>
                <span className="text-success">{output.status}</span> ·{" "}
                <span className="tabular-nums">{output.chars}</span> {t("charsExtracted")}
              </div>
            </>
          ) : (
            <div className="text-destructive">{output.error || t("scrapeFailed")}</div>
          )}
        </div>
      )}
    </ToolShell>
  )
}

function SaveToolPart({
  part,
  mode,
}: {
  part: UIPart
  mode: "created" | "refined"
}) {
  const t = useTranslations("copilot.tools")
  const tSolutions = useTranslations("solutions")
  const output = part.output as
    | {
        ok: boolean
        lead_id?: string
        company_name?: string
        lead_score?: number
        suggested_solution?: "automation" | "custom_software"
      }
    | undefined

  return (
    <ToolShell
      icon={mode === "refined" ? <Wand2 className="size-3" /> : <Database className="size-3" />}
      label={t(mode === "refined" ? "refine" : "save")}
      state={part.state}
    >
      {output?.ok && (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div className="text-foreground">
            {output.company_name}{" "}
            <span className="text-muted-foreground">
              · {t("score")}{" "}
              <span
                className={cn(
                  output.lead_score && output.lead_score >= 70 ? "text-primary" : "text-foreground",
                )}
              >
                {output.lead_score}
              </span>
            </span>
          </div>
          <div className="text-muted-foreground">
            {t(mode === "refined" ? "refinedAs" : "savedAs")}
            {output.suggested_solution && <> · {tSolutions(output.suggested_solution)}</>}
          </div>
        </div>
      )}
      {part.errorText && (
        <div className="font-mono text-[11px] text-destructive">{part.errorText}</div>
      )}
    </ToolShell>
  )
}
