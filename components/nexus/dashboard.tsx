"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Bot, Inbox, Sparkles } from "lucide-react"
import { TopBar } from "./top-bar"
import { PipelinePanel } from "./pipeline-panel"
import { LeadDetailPanel } from "./lead-detail-panel"
import { CopilotPanel } from "./copilot-panel"
import { AgencyConfigSheet } from "./agency-config-sheet"
import { listLeads, updateLeadStatus, deleteLead, getLead } from "@/app/actions"
import type { AgencyConfig, Lead, LeadStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  initialLeads: Lead[]
  initialAgency: AgencyConfig
}

/**
 * Mobile-only sub-view selector. On `md+` the dashboard is a 3-column grid
 * and this component is hidden — there's no need for tabs because every
 * panel is on screen at once.
 */
type MobileTab = "pipeline" | "lead" | "copilot"

export function NexusDashboard({ initialLeads, initialAgency }: Props) {
  const t = useTranslations()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [agency, setAgency] = useState<AgencyConfig>(initialAgency)
  const [selectedId, setSelectedId] = useState<string | null>(initialLeads[0]?.id ?? null)
  const [agencySheetOpen, setAgencySheetOpen] = useState(false)
  // Lead currently bound to the Co-Pilot for refinement. Independent from
  // `selectedId` (the lead being viewed in the detail panel) — the user may
  // browse other leads while continuing to chat about a specific one.
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  // Visible mobile tab. Ignored on desktop where all 3 panels are shown.
  const [mobileTab, setMobileTab] = useState<MobileTab>("pipeline")

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId],
  )

  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeLeadId) ?? null,
    [leads, activeLeadId],
  )

  const refreshLeads = useCallback(async () => {
    const fresh = await listLeads()
    setLeads(fresh)
    return fresh
  }, [])

  const handleAgentComplete = useCallback(
    async (leadId: string, mode: "created" | "refined") => {
      const fresh = await refreshLeads()
      const lead = fresh.find((l) => l.id === leadId)
      if (lead) {
        setSelectedId(lead.id)
        // After a brand-new analysis, automatically pin the lead so the user
        // can immediately ask for refinements ("hacelo más casual"). On a
        // refinement turn the lead is already pinned.
        if (mode === "created") setActiveLeadId(lead.id)
        toast.success(
          t(mode === "refined" ? "copilot.refinedToast" : "copilot.savedToast", {
            company: lead.company_name,
            score: lead.lead_score,
          }),
        )
      }
    },
    [refreshLeads, t],
  )

  // On mobile we want a sensible flow: clicking a lead in the pipeline
  // jumps the user into the detail tab so they can read the analysis.
  // We branch on viewport width via `matchMedia` so desktop is untouched.
  const isMobileViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    if (isMobileViewport()) setMobileTab("lead")
  }, [])

  const handleRefine = useCallback((id: string) => {
    setActiveLeadId(id)
    setSelectedId(id)
    if (isMobileViewport()) setMobileTab("copilot")
  }, [])

  const handleStatusChange = useCallback(
    async (id: string, status: LeadStatus) => {
      // optimistic update
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
      try {
        await updateLeadStatus(id, status)
      } catch {
        toast.error(t("toasts.statusUpdateFailed"))
        await refreshLeads()
      }
    },
    [refreshLeads, t],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const previous = leads
      setLeads((prev) => prev.filter((l) => l.id !== id))
      if (selectedId === id) {
        const next = previous.find((l) => l.id !== id)
        setSelectedId(next?.id ?? null)
      }
      // If the deleted lead was bound to the Co-Pilot, drop the binding —
      // chat history was cascaded via the FK and the thread is now orphaned.
      if (activeLeadId === id) setActiveLeadId(null)
      try {
        await deleteLead(id)
        toast.success(t("toasts.leadRemoved"))
      } catch {
        toast.error(t("toasts.removeLeadFailed"))
        setLeads(previous)
      }
    },
    [leads, selectedId, activeLeadId, t],
  )

  // refresh selected lead from DB whenever it changes — keeps messages fresh
  const [selectedFull, setSelectedFull] = useState<Lead | null>(selectedLead)
  useEffect(() => {
    let cancelled = false
    if (!selectedId) {
      setSelectedFull(null)
      return
    }
    getLead(selectedId).then((l) => {
      if (!cancelled) setSelectedFull(l)
    })
    return () => {
      cancelled = true
    }
  }, [selectedId, leads])

  // ---- Mobile-only show/hide helpers -----------------------------------
  // Tailwind `hidden` wins over `flex` because of utility ordering, so we
  // emit `hidden` on inactive tabs and rely on `md:flex` (set inside each
  // panel's root) to restore the desktop layout.
  const hideOnMobile = (tab: MobileTab) =>
    mobileTab === tab ? "flex md:flex" : "hidden md:flex"

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <TopBar
        agency={agency}
        leadCount={leads.length}
        onOpenAgency={() => setAgencySheetOpen(true)}
      />

      <MobileTabBar
        active={mobileTab}
        onChange={setMobileTab}
        leadCount={leads.length}
        hasLead={!!selectedFull}
        hasActiveLead={!!activeLeadId}
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)_380px] xl:grid-cols-[360px_minmax(0,1fr)_440px]">
        <PipelinePanel
          className={hideOnMobile("pipeline")}
          leads={leads}
          selectedId={selectedId}
          onSelect={handleSelect}
          onStatusChange={handleStatusChange}
        />

        <LeadDetailPanel
          className={hideOnMobile("lead")}
          lead={selectedFull}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onRefine={handleRefine}
          isActiveInCopilot={!!activeLeadId && selectedFull?.id === activeLeadId}
        />

        <CopilotPanel
          className={hideOnMobile("copilot")}
          agency={agency}
          activeLead={activeLead}
          onActiveLeadChange={setActiveLeadId}
          onAnalysisSaved={handleAgentComplete}
        />
      </div>

      <AgencyConfigSheet
        open={agencySheetOpen}
        onOpenChange={setAgencySheetOpen}
        agency={agency}
        onSaved={(next) => {
          setAgency(next)
          toast.success(t("agencyConfig.savedToast"))
        }}
      />
    </div>
  )
}

/**
 * 3-tab strip rendered between the TopBar and the panel grid on screens
 * narrower than `md`. Disabled tabs (e.g. "Lead" with no selection) keep
 * their slot for layout stability and a faded affordance.
 */
function MobileTabBar({
  active,
  onChange,
  leadCount,
  hasLead,
  hasActiveLead,
}: {
  active: MobileTab
  onChange: (tab: MobileTab) => void
  leadCount: number
  hasLead: boolean
  hasActiveLead: boolean
}) {
  const t = useTranslations("mobile.tabs")

  const tabs: Array<{
    id: MobileTab
    icon: typeof Inbox
    label: string
    count?: number
    disabled?: boolean
    badge?: boolean
  }> = [
    {
      id: "pipeline",
      icon: Inbox,
      label: t("pipeline"),
      count: leadCount,
    },
    {
      id: "lead",
      icon: Sparkles,
      label: t("lead"),
      disabled: !hasLead,
    },
    {
      id: "copilot",
      icon: Bot,
      label: t("copilot"),
      badge: hasActiveLead,
    },
  ]

  return (
    <div
      role="tablist"
      aria-label={t("ariaLabel")}
      className="flex shrink-0 border-b border-border bg-sidebar md:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 border-r border-border px-2 py-2.5 text-[11px] font-mono uppercase tracking-wider transition last:border-r-0",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
              tab.disabled && "pointer-events-none opacity-40",
            )}
          >
            <Icon className="size-3.5" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-sm bg-card px-1 text-[10px] tabular-nums">
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary"
              />
            )}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
