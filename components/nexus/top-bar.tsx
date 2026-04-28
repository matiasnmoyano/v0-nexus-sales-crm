"use client"

import { Activity, Settings2, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { LangToggle } from "./lang-toggle"
import { InfoModal } from "./info-modal"
import type { AgencyConfig } from "@/lib/types"

interface Props {
  agency: AgencyConfig
  leadCount: number
  onOpenAgency: () => void
}

export function TopBar({ agency, leadCount, onOpenAgency }: Props) {
  const t = useTranslations("header")

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-4" strokeWidth={2.4} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm tracking-tight text-foreground">nexus</span>
          <span className="font-mono text-sm text-muted-foreground">/</span>
          <span className="font-mono text-sm text-muted-foreground">sales</span>
        </div>
        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
          {t("tagline")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-success nexus-pulse-dot" />
          <span className="font-mono">gpt-5-mini</span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground md:flex">
          <Activity className="size-3" />
          <span className="font-mono">{t("leadCount", { count: leadCount })}</span>
        </div>

        <LangToggle />

        <InfoModal />

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAgency}
          aria-label={t("configButton")}
          className="gap-2 bg-card font-mono text-xs"
        >
          <Settings2 className="size-3.5" />
          <span className="hidden max-w-[140px] truncate sm:inline">{agency.name}</span>
        </Button>
      </div>
    </header>
  )
}
