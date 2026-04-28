import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  // Don't add a /es prefix on the default locale — keeps URLs clean.
  localePrefix: "as-needed",
})

export type AppLocale = (typeof routing.locales)[number]
