"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LangToggle } from "@/components/nexus/lang-toggle"

/**
 * Sticky landing header. Compacts (height 56 → 48px) once the user has
 * scrolled past 100px, with a smooth Framer transition.
 */
export function LandingNav() {
  const t = useTranslations("landing.nav")
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const navItems = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#demo", label: t("demo") },
    { href: "#stack", label: t("stack") },
    { href: "#faq", label: t("faq") },
  ]

  return (
    <motion.header
      initial={false}
      animate={{ height: scrolled ? 56 : 72 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-40 flex items-center border-b transition-colors",
        scrolled
          ? "border-white/[0.06] bg-[#080B14]/85 backdrop-blur-xl"
          : "border-transparent bg-[#080B14]/50 backdrop-blur-sm",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="grid size-7 place-items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <Zap className="size-3.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Nexus Sales
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-white/60 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle />
          <Link
            href="/app"
            className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-md px-4 text-[13px] font-semibold text-black transition"
            style={{
              backgroundImage: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
              boxShadow: "0 8px 24px -8px rgba(34, 211, 238, 0.5)",
            }}
          >
            <span className="relative z-10">{t("openApp")}</span>
            <span
              className="relative z-10 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
