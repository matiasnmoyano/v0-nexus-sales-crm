"use client"

import { useTransition } from "react"
import { Languages } from "lucide-react"
import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing, type AppLocale } from "@/i18n/routing"
import { cn } from "@/lib/utils"

/**
 * Compact ES / EN segmented toggle.  Persists the choice via the next-intl
 * NEXT_LOCALE cookie (set automatically by the middleware on navigation).
 */
export function LangToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale() as AppLocale
  const [isPending, startTransition] = useTransition()

  const switchTo = (next: AppLocale) => {
    if (next === currentLocale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex h-7 items-center rounded-md border border-border bg-card p-0.5 font-mono text-[11px] uppercase tracking-wider"
    >
      <Languages
        className="ml-1 mr-0.5 size-3 text-muted-foreground"
        aria-hidden="true"
      />
      {routing.locales.map((locale) => {
        const active = locale === currentLocale
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => switchTo(locale as AppLocale)}
            disabled={isPending}
            className={cn(
              "flex h-6 min-w-7 items-center justify-center rounded-sm px-1.5 transition",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
              isPending && "opacity-60",
            )}
          >
            {locale}
          </button>
        )
      })}
    </div>
  )
}
