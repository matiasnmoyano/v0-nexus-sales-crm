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

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId],
  )

  const refreshLeads = useCallback(async () => {
    const fresh = await listLeads()
    setLeads(fresh)
    return fresh
  }, [])

  const handleAgentComplete = useCallback(
    async (leadId: string) => {
      const fresh = await refreshLeads()
      const newLead = fresh.find((l) => l.id === leadId)
      if (newLead) {
        setSelectedId(newLead.id)
        toast.success(
          t("copilot.savedToast", {
            company: newLead.company_name,
            score: newLead.lead_score,
          }),
        )
      }
    },
    [refreshLeads, t],
  )

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
      try {
        await deleteLead(id)
        toast.success(t("toasts.leadRemoved"))
      } catch {
        toast.error(t("toasts.removeLeadFailed"))
        setLeads(previous)
      }
    },
    [leads, selectedId, t],
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

        <LeadDetailPanel lead={selectedFull} onStatusChange={handleStatusChange} onDelete={handleDelete} />

        <CopilotPanel agency={agency} onAnalysisSaved={handleAgentComplete} />
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
