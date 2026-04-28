"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { ScoreRing } from "./score-ring"
import { listMessagesForLead } from "@/app/actions"
import { cn } from "@/lib/utils"
import {
  type Channel,
  type Lead,
  type LeadStatus,
  type Message,
  type MessageType,
  STATUS_ORDER,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface Props {
  lead: Lead | null
  onStatusChange: (id: string, status: LeadStatus) => void
  onDelete: (id: string) => void
}

const STATUS_DOT: Record<LeadStatus, string> = {
  analyzed: "bg-primary",
  contacted: "bg-chart-2",
  follow_up: "bg-chart-3",
  meeting: "bg-success",
  discarded: "bg-muted-foreground/40",
}

export function LeadDetailPanel({ lead, onStatusChange, onDelete }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!lead) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    listMessagesForLead(lead.id)
      .then((rows) => {
        if (!cancelled) setMessages(rows)
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [lead?.id])

  if (!lead) {
    return (
      <section className="flex min-h-0 items-center justify-center border-r border-border bg-background">
        <Empty className="max-w-sm border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>{t("leadDetail.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("leadDetail.emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-col border-r border-border bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", STATUS_DOT[lead.status])} />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t(`statuses.${lead.status}` as `statuses.analyzed`)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(lead.created_at).toLocaleString(locale, {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">{t("leadDetail.leadActions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {t("leadDetail.moveTo")}
            </DropdownMenuLabel>
            {STATUS_ORDER.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onStatusChange(lead.id, s)}
                disabled={s === lead.status}
              >
                <span className={cn("mr-2 size-1.5 rounded-full", STATUS_DOT[s])} />
                {t(`statuses.${s}` as `statuses.analyzed`)}
                {s === lead.status && <Check className="ml-auto size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(lead.id)}
              className="gap-2"
            >
              <Trash2 className="size-3.5" />
              {t("leadDetail.deleteLead")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 p-5 pb-10">
          <Header lead={lead} />
          <Problems lead={lead} />
          <ScoreCard lead={lead} />
          <MessagesSection lead={lead} messages={messages} loading={loadingMessages} />
        </div>
      </ScrollArea>
    </section>
  )
}

function Header({ lead }: { lead: Lead }) {
  const t = useTranslations()
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 space-y-2">
        <h1 className="text-balance text-2xl font-medium tracking-tight text-foreground">
          {lead.company_name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {lead.industry && (
            <span className="rounded-sm border border-border bg-card px-2 py-0.5 font-mono">
              {lead.industry}
            </span>
          )}
          <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono uppercase tracking-wide text-primary">
            {t(`solutions.${lead.suggested_solution}` as `solutions.automation`)}
          </span>
          {lead.url && (
            <a
              href={lead.url.startsWith("http") ? lead.url : `https://${lead.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:text-primary"
            >
              <ExternalLink className="size-3" />
              {lead.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
        <p className="max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
          {lead.solution_justification}
        </p>
      </div>
      <ScoreRing score={lead.lead_score} size={84} strokeWidth={6} className="shrink-0" />
    </div>
  )
}

function Problems({ lead }: { lead: Lead }) {
  const t = useTranslations()
  if (!lead.detected_problems?.length) return null
  return (
    <section className="space-y-2.5">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {t("leadDetail.problems")}
      </h2>
      <ul className="space-y-2">
        {lead.detected_problems.map((p, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-card px-3.5 py-3 text-sm"
          >
            <div className="flex items-start gap-2">
              <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
              <div className="space-y-1">
                <div className="font-medium text-foreground">{p.title}</div>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.evidence}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ScoreCard({ lead }: { lead: Lead }) {
  const t = useTranslations()
  const b = lead.score_breakdown
  const rows: Array<{ key: "digital_pain" | "buying_capacity" | "service_fit"; value: number }> = [
    { key: "digital_pain", value: b?.digital_pain ?? 0 },
    { key: "buying_capacity", value: b?.buying_capacity ?? 0 },
    { key: "service_fit", value: b?.service_fit ?? 0 },
  ]
  return (
    <section className="space-y-2.5">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {t("leadDetail.scoreBreakdown")}
      </h2>
      <div className="rounded-md border border-border bg-card p-4">
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[140px_1fr_40px] items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {t(`leadDetail.scoreLabels.${r.key}` as `leadDetail.scoreLabels.digital_pain`)}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    r.value >= 70 ? "bg-primary" : r.value >= 40 ? "bg-chart-2" : "bg-muted-foreground/60",
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, r.value))}%` }}
                />
              </div>
              <span className="text-right font-mono text-xs tabular-nums text-foreground">
                {r.value}
              </span>
            </div>
          ))}
        </div>
        {b?.reason && (
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            {b.reason}
          </p>
        )}
      </div>
    </section>
  )
}

function MessagesSection({
  lead,
  messages,
  loading,
}: {
  lead: Lead
  messages: Message[]
  loading: boolean
}) {
  const t = useTranslations()
  const channels: Channel[] = useMemo(() => {
    const set = new Set(messages.map((m) => m.channel))
    return (["email", "linkedin", "whatsapp"] as Channel[]).filter((c) => set.has(c))
  }, [messages])

  const [active, setActive] = useState<Channel>("email")
  useEffect(() => {
    if (channels.length && !channels.includes(active)) setActive(channels[0])
  }, [channels, active])

  // silence unused-var warnings in TSX without erasing the prop, which is part
  // of the panel's public API and will be useful when we add channel filters.
  void lead

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {t("leadDetail.outreach")}
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {t("leadDetail.ready", { count: messages.length })}
        </span>
      </div>

      {loading ? (
        <div className="rounded-md border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          {t("leadDetail.loading")}
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground">
          {t("leadDetail.noDrafts")}
        </div>
      ) : (
        <Tabs value={active} onValueChange={(v) => setActive(v as Channel)}>
          <TabsList className="bg-card">
            {channels.map((c) => (
              <TabsTrigger key={c} value={c} className="gap-1.5 font-mono text-xs">
                {c === "email" && <Mail className="size-3" />}
                {c === "linkedin" && <ArrowUpRight className="size-3" />}
                {c === "whatsapp" && <MessageSquare className="size-3" />}
                {t(`channels.${c}` as `channels.email`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {channels.map((c) => {
            const channelMessages = messages.filter((m) => m.channel === c)
            return (
              <TabsContent key={c} value={c} className="mt-3 space-y-3">
                {channelMessages.map((m) => (
                  <MessageCard key={m.id} message={m} />
                ))}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </section>
  )
}

function MessageCard({ message }: { message: Message }) {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)
  return (
    <article className="rounded-md border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3.5 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {t(`leadDetail.messageTypes.${message.type as MessageType}` as `leadDetail.messageTypes.initial`)}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message.content)
              setCopied(true)
              toast.success(t("toasts.copied"))
              setTimeout(() => setCopied(false), 1500)
            } catch {
              toast.error(t("toasts.copyFailed"))
            }
          }}
          className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          {copied ? t("leadDetail.copied") : t("leadDetail.copy")}
        </button>
      </header>
      <div className="whitespace-pre-wrap px-3.5 py-3 text-sm leading-relaxed text-foreground">
        {message.content}
      </div>
    </article>
  )
}
