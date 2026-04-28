import { Suspense } from "react"
import { NexusDashboard } from "@/components/nexus/dashboard"
import { getAgencyConfig, listLeads } from "@/app/actions"

export const dynamic = "force-dynamic"

async function DashboardLoader() {
  const [leads, agency] = await Promise.all([listLeads(), getAgencyConfig()])
  return <NexusDashboard initialLeads={leads} initialAgency={agency} />
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-muted-foreground text-sm font-mono">
          Booting Nexus…
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  )
}
