import type { Metadata } from "next"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { LazyMotionProvider } from "@/components/landing/lazy-motion-provider"
import { BgOrbs } from "@/components/landing/bg-orbs"
import { LandingNav } from "@/components/landing/nav"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Philosophy } from "@/components/landing/philosophy"
import { Stack } from "@/components/landing/stack"
import { Showcase } from "@/components/landing/showcase"
import { UseCases } from "@/components/landing/use-cases"
import { Faq } from "@/components/landing/faq"
import { FinalCta } from "@/components/landing/final-cta"
import { LandingFooter } from "@/components/landing/footer"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "landing.meta" })
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      siteName: "Nexus Sales",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <LazyMotionProvider>
      <BgOrbs />
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Philosophy />
        <Stack />
        <Showcase />
        <UseCases />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </LazyMotionProvider>
  )
}
