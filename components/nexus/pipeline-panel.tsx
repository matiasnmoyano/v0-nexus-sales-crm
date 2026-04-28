"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, ChevronRight, Inbox, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { type Lead, type LeadStatus, STATUS_ORDER } from "@/lib/types"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Props {
  leads: Lead[]
  selectedId: string | null
  onSelect: (id: string) => void
  onStatusChange: (id: string, status: LeadStatus) => void
}

const STATUS_DOT: Record<LeadStatus, string> = {
  analyzed: "bg-primary",
  contacted: "bg-chart-2",
  follow_up: "bg-chart-3",
  meeting: "bg-success",
  discarded: "bg-muted-foreground/40",
}

export function PipelinePanel({ leads, selectedId, onSelect, onStatusChange }: Props) {
  const t = useTranslations()
  const [filter, setFilter] = useState<LeadStatus | "all">("all")
  const [query, setQuery] = useState("")

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = {
      analyzed: 0,
      contacted: 0,
      follow_up: 0,
      meeting: 0,
      discarded: 0,
    }
    for (const l of leads) c[l.status] += 1
    return c
  }, [leads])

  const filtered = useMemo(() => {
    let out = leads
    if (filter !== "all") out = out.filter((l) => l.status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      out = out.filter(
        (l) =>
          l.company_name.toLowerCase().includes(q) ||
          (l.industry?.toLowerCase().includes(q) ?? false) ||
          (l.url?.toLowerCase().includes(q) ?? false),
      )
    }
    return out
  }, [leads, filter, query])

  return (
    <aside className="flex flex-col border-r border-border bg-sidebar/60 min-h-0">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Inbox className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t("searchPanel.title")}
          </span>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {leads.length}
        </span>
      </div>

      <div className="border-b border-border px-3 py-3 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPanel.searchPlaceholder")}
            className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <FilterChip
            label={t("searchPanel.filterAll")}
            active={filter === "all"}
            count={leads.length}
            onClick={() => setFilter("all")}
          />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              label={t(`statuses.${s}` as `statuses.analyzed`)}
              active={filter === s}
              count={counts[s]}
              dot={STATUS_DOT[s]}
              onClick={() => setFilter(s)}
            />
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {filtered.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle className="text-sm">{t("searchPanel.emptyTitle")}</EmptyTitle>
              <EmptyDescription className="text-xs">
                {t("searchPanel.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((lead) => (
              <li key={lead.id}>
                <LeadRow
                  lead={lead}
                  selected={selectedId === lead.id}
                  onSelect={() => onSelect(lead.id)}
                  onStatusChange={(s) => onStatusChange(lead.id, s)}
                />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </aside>
  )
}

function FilterChip({
  label,
  active,
  count,
  dot,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  dot?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono transition",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dot)} />}
      <span>{label}</span>
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  )
}

function LeadRow({
  lead,
  selected,
  onSelect,
  onStatusChange,
}: {
  lead: Lead
  selected: boolean
  onSelect: () => void
  onStatusChange: (s: LeadStatus) => void
}) {
  const t = useTranslations()
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full flex-col gap-1.5 px-4 py-3 text-left transition",
        selected ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{lead.company_name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", STATUS_DOT[lead.status])} />
            <span className="font-mono">
              {t(`statuses.${lead.status}` as `statuses.analyzed`)}
            </span>
            {lead.industry && (
              <>
                <span>·</span>
                <span className="truncate">{lead.industry}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-baseline gap-1 font-mono tabular-nums">
          <span className={cn("text-base font-medium", lead.lead_score >= 70 ? "text-primary" : "text-foreground")}>
            {lead.lead_score}
          </span>
          <span className="text-[10px] text-muted-foreground">{t("searchPanel.scoreSuffix")}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="rounded-sm border border-border/70 bg-card px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          {t(`solutions.${lead.suggested_solution}` as `solutions.automation`)}
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 text-muted-foreground transition",
            selected ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
          )}
        />
      </div>

      {lead.status !== "discarded" && (
        <NextStatusButton lead={lead} onStatusChange={onStatusChange} />
      )}
    </button>
  )
}

function NextStatusButton({
  lead,
  onStatusChange,
}: {
  lead: Lead
  onStatusChange: (s: LeadStatus) => void
}) {
  const t = useTranslations("searchPanel.nextActions")
  const next: Partial<Record<LeadStatus, { labelKey: "markContacted" | "markFollowUp" | "markMeeting"; to: LeadStatus }>> = {
    analyzed: { labelKey: "markContacted", to: "contacted" },
    contacted: { labelKey: "markFollowUp", to: "follow_up" },
    follow_up: { labelKey: "markMeeting", to: "meeting" },
  }
  const action = next[lead.status]
  if (!action) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onStatusChange(action.to)
      }}
      className="mt-1 hidden items-center gap-1 self-start rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition hover:border-primary/40 hover:text-primary group-hover:flex"
    >
      <CheckCircle2 className="size-3" />
      {t(action.labelKey)}
    </button>
  )
}
