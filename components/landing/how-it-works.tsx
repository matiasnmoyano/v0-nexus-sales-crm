"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Brain, PenLine, Search } from "lucide-react"
import { fadeInUp, staggerChildren, viewportOnce } from "@/lib/motion-variants"

const ICONS = [Search, Brain, PenLine] as const

export function HowItWorks() {
  const t = useTranslations("landing.howItWorks")

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 py-24 md:py-32"
      aria-labelledby="how-title"
    >
      <div className="mx-auto w-full max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/70">
            {t("kicker")}
          </p>
          <h2
            id="how-title"
            className="font-display text-balance text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-white/55">{t("subtitle")}</p>
        </motion.div>

        <div className="relative mt-16">
          {/* Connector — horizontal on desktop, vertical on mobile */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-12 hidden h-px w-[80%] -translate-x-1/2 landing-connector md:block"
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 -mx-px h-full w-px landing-connector md:hidden"
            style={{ writingMode: "vertical-lr" as const }}
          />

          <motion.ol
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren}
            className="grid gap-6 md:grid-cols-3 md:gap-8"
          >
            {(["step1", "step2", "step3"] as const).map((key, i) => {
              const Icon = ICONS[i]
              return (
                <motion.li
                  key={key}
                  variants={fadeInUp}
                  className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur-md transition-colors hover:border-cyan-400/20"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span
                      className="font-mono text-4xl font-bold landing-gradient-text"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {t(`${key}.number`)}
                    </span>
                    <span className="grid size-10 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-cyan-300 transition-colors group-hover:border-cyan-400/30 group-hover:bg-cyan-400/5">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/60">
                    {t(`${key}.desc`)}
                  </p>
                </motion.li>
              )
            })}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}
