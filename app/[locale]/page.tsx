import { Suspense } from "react"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { NexusDashboard } from "@/components/nexus/dashboard"
import { getAgencyConfig, listLeads } from "@/app/actions"

export const dynamic = "force-dynamic"

async function DashboardLoader() {
  const [leads, agency] = await Promise.all([listLeads(), getAgencyConfig()])
  return <NexusDashboard initialLeads={leads} initialAgency={agency} />
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()

  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-muted-foreground text-sm font-mono">
          {t("boot")}
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  )
}
