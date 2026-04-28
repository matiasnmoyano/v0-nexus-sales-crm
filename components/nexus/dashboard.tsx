"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { TopBar } from "./top-bar"
import { PipelinePanel } from "./pipeline-panel"
import { LeadDetailPanel } from "./lead-detail-panel"
import { CopilotPanel } from "./copilot-panel"
import { AgencyConfigSheet } from "./agency-config-sheet"
import { listLeads, updateLeadStatus, deleteLead, getLead } from "@/app/actions"
import type { AgencyConfig, Lead, LeadStatus } from "@/lib/types"
import { toast } from "sonner"

interface Props {
  initialLeads: Lead[]
  initialAgency: AgencyConfig
}

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

  const handleRefine = useCallback((id: string) => {
    setActiveLeadId(id)
    setSelectedId(id)
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

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <TopBar
        agency={agency}
        leadCount={leads.length}
        onOpenAgency={() => setAgencySheetOpen(true)}
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)_380px] xl:grid-cols-[360px_minmax(0,1fr)_440px]">
        <PipelinePanel
          leads={leads}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onStatusChange={handleStatusChange}
        />

        <LeadDetailPanel
          lead={selectedFull}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onRefine={handleRefine}
          isActiveInCopilot={!!activeLeadId && selectedFull?.id === activeLeadId}
        />

        <CopilotPanel
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
