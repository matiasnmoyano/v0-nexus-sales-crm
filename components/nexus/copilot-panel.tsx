"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useRef, useState } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgencyConfig } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Props {
  agency: AgencyConfig
  onAnalysisSaved: (leadId: string) => void
}

const EXAMPLES = [
  "https://www.notion.so",
  "https://www.linear.app",
  "https://www.attio.com",
]

export function CopilotPanel({ agency, onAnalysisSaved }: Props) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastSavedRef = useRef<string | null>(null)

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  })

  // Detect a successful save_analysis tool result and notify parent.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role !== "assistant" || !m.parts) continue
      for (const part of m.parts) {
        if (
          // tool-output part type for tool 'save_analysis'
          part.type === "tool-save_analysis" &&
          (part as { state?: string }).state === "output-available"
        ) {
          const out = (part as { output?: { ok?: boolean; lead_id?: string } }).output
          if (out?.ok && out.lead_id && lastSavedRef.current !== out.lead_id) {
            lastSavedRef.current = out.lead_id
            onAnalysisSaved(out.lead_id)
          }
        }
      }
    }
  }, [messages, onAnalysisSaved])

  // auto-scroll while streaming
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, status])

  const isStreaming = status === "streaming" || status === "submitted"

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    setInput("")
    sendMessage({ text })
  }

  return (
    <aside className="flex min-h-0 flex-col bg-sidebar/60">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Bot className="size-3.5 text-primary" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Co-Pilot
          </span>
          {isStreaming && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              <span className="size-1 rounded-full bg-primary nexus-pulse-dot" />
              Live
            </span>
          )}
        </div>
        {messages.length > 0 && !isStreaming && (
          <button
            type="button"
            onClick={() => {
              setMessages([])
              lastSavedRef.current = null
            }}
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Trash className="size-3" />
            Clear
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="space-y-4 p-4 pb-2">
          {messages.length === 0 ? (
            <Welcome agency={agency} onPick={(s) => setInput(s)} />
          ) : (
            messages.map((m) => <MessageItem key={m.id} message={m} />)
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              <span className="font-mono">{error.message}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border bg-card p-3">
        <div className="rounded-md border border-border bg-background focus-within:border-primary/60">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Drop a URL or describe a lead…"
            rows={2}
            className="block w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              ⏎ to analyse · ⇧⏎ for newline
            </span>
            {isStreaming ? (
              <Button type="button" size="sm" variant="outline" onClick={() => stop()} className="gap-1.5 font-mono text-xs">
                <Square className="size-3" />
                Stop
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={!input.trim()} className="gap-1.5 font-mono text-xs">
                <ArrowUp className="size-3" />
                Analyse
              </Button>
            )}
          </div>
        </div>
      </form>
    </aside>
  )
}

function Welcome({
  agency,
  onPick,
}: {
  agency: AgencyConfig
  onPick: (text: string) => void
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
            Briefing
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          I&apos;m the senior sales analyst at <span className="text-foreground">{agency.name}</span>.
          Drop a website URL and I&apos;ll scrape it, decide whether automation or custom software fits,
          score the lead and draft outreach in your tone.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Try one of these
        </span>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onPick(url)}
              className="group flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-xs">
                <Globe className="size-3 text-muted-foreground" />
                <span className="font-mono text-foreground">{url.replace(/^https?:\/\//, "")}</span>
              </span>
              <ArrowUp className="size-3 -rotate-45 text-muted-foreground transition group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface UIPart {
  type: string
  text?: string
  state?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

function MessageItem({ message }: { message: { role: string; parts?: UIPart[] } }) {
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

  return (
    <div className="space-y-2">
      {(message.parts ?? []).map((part, i) => {
        if (part.type === "text") {
          return (
            <div
              key={i}
              className="rounded-md border border-border bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground"
            >
              <span className="whitespace-pre-wrap">{part.text}</span>
            </div>
          )
        }
        if (part.type === "tool-scrape_website") {
          return <ScrapeToolPart key={i} part={part} />
        }
        if (part.type === "tool-save_analysis") {
          return <SaveToolPart key={i} part={part} />
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
  const isError = state === "output-error"
  const isDone = state === "output-available"
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
        {state === "input-streaming" || state === "input-available" ? (
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
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {state === "input-streaming" || state === "input-available"
              ? "running"
              : isDone
                ? "done"
                : isError
                  ? "error"
                  : ""}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function ScrapeToolPart({ part }: { part: UIPart }) {
  const input = part.input as { url?: string } | undefined
  const output = part.output as
    | { ok: boolean; url?: string; status?: number; title?: string; chars?: number; error?: string }
    | undefined

  return (
    <ToolShell icon={<Globe className="size-3" />} label="Scrape website" state={part.state}>
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
                <span className="tabular-nums">{output.chars}</span> chars extracted
              </div>
            </>
          ) : (
            <div className="text-destructive">{output.error || "scrape failed"}</div>
          )}
        </div>
      )}
    </ToolShell>
  )
}

function SaveToolPart({ part }: { part: UIPart }) {
  const output = part.output as
    | {
        ok: boolean
        lead_id?: string
        company_name?: string
        lead_score?: number
        suggested_solution?: string
      }
    | undefined

  return (
    <ToolShell
      icon={<Database className="size-3" />}
      label="Save analysis"
      state={part.state}
    >
      {output?.ok && (
        <div className="space-y-0.5 font-mono text-[11px]">
          <div className="text-foreground">
            {output.company_name}{" "}
            <span className="text-muted-foreground">
              · score{" "}
              <span className={cn(output.lead_score && output.lead_score >= 70 ? "text-primary" : "text-foreground")}>
                {output.lead_score}
              </span>
            </span>
          </div>
          <div className="text-muted-foreground">
            saved as lead · {output.suggested_solution?.replace("_", " ")}
          </div>
        </div>
      )}
      {part.errorText && <div className="font-mono text-[11px] text-destructive">{part.errorText}</div>}
    </ToolShell>
  )
}
