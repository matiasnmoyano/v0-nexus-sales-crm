"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { useTranslations } from "next-intl"
import { LangToggle } from "@/components/nexus/lang-toggle"

export function LandingFooter() {
  const t = useTranslations("landing.footer")

  return (
    <footer className="relative border-t border-white/[0.06] bg-[#070912]/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <Zap className="size-3.5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-white">Nexus Sales</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {t("tagline")}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-5 text-[12px] text-white/55" aria-label="Footer">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-white"
          >
            {t("links.github")}
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-white"
          >
            {t("links.twitter")}
          </a>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-white"
          >
            {t("links.vercel")}
          </a>
          <Link href="/app" className="transition-colors hover:text-white">
            {t("links.app")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle />
        </div>
      </div>
    </footer>
  )
}
