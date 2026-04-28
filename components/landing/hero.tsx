"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { fadeInUp, staggerChildren } from "@/lib/motion-variants"
import { HeroDemo } from "./hero-demo"

const STACK_PILLS = [
  { label: "Next.js 16", initial: "▲" },
  { label: "AI Gateway", initial: "✦" },
  { label: "GPT-5 / Claude", initial: "◆" },
  { label: "Firecrawl", initial: "F" },
  { label: "Exa", initial: "E" },
  { label: "Neon", initial: "N" },
]

export function Hero() {
  const t = useTranslations("landing.hero")

  return (
    <section
      id="main"
      className="relative pt-12 pb-24 md:pt-20 md:pb-32"
      aria-labelledby="hero-title"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-12 xl:gap-16">
        {/* Left column — message */}
        <motion.div initial="hidden" animate="visible" variants={staggerChildren} className="flex flex-col justify-center">
          <motion.span
            variants={fadeInUp}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 font-mono text-[11px] text-cyan-300"
          >
            <span className="size-1.5 rounded-full bg-cyan-400 nexus-pulse-dot" />
            {t("eyebrow")}
          </motion.span>

          <motion.h1
            id="hero-title"
            variants={fadeInUp}
            className="mt-5 font-display font-extrabold tracking-tight text-balance text-white"
            style={{ fontSize: "clamp(40px, 6vw, 76px)", lineHeight: 1.04 }}
          >
            {t("title")}
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-[560px] text-[17px] leading-relaxed text-white/55"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#demo"
              className="group inline-flex h-12 items-center gap-2 rounded-md px-5 text-[14px] font-semibold text-black transition active:scale-[0.97]"
              style={{
                backgroundImage: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
                boxShadow: "0 12px 32px -8px rgba(34, 211, 238, 0.5)",
              }}
            >
              {t("ctaPrimary")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link
              href="/app"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-5 text-[14px] font-semibold text-white/80 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              {t("ctaSecondary")}
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
              {t("poweredBy")}
            </p>
            <ul className="mt-3 flex flex-wrap items-center gap-1.5">
              {STACK_PILLS.map((p) => (
                <li
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/60 backdrop-blur-sm transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-100"
                >
                  <span className="font-mono text-[10px] text-cyan-300/70">{p.initial}</span>
                  {p.label}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Right column — live demo */}
        <div id="demo" className="relative scroll-mt-32">
          <HeroDemo />
        </div>
      </div>
    </section>
  )
}
