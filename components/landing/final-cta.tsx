"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { fadeInUp, viewportOnce } from "@/lib/motion-variants"

export function FinalCta() {
  const t = useTranslations("landing.finalCta")

  return (
    <section className="relative py-32" aria-labelledby="final-title">
      <div className="mx-auto w-full max-w-4xl px-6 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-cyan-400/[0.04] via-white/[0.02] to-violet-400/[0.04] p-10 backdrop-blur-xl md:p-16"
          style={{ boxShadow: "0 40px 120px -20px rgba(34, 211, 238, 0.2)" }}
        >
          <div
            aria-hidden="true"
            className="absolute -left-32 top-1/2 size-72 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(34,211,238,0.25), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -right-32 top-1/2 size-72 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(168,85,247,0.22), transparent 60%)",
            }}
          />

          <p className="relative mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
            {t("kicker")}
          </p>
          <h2
            id="final-title"
            className="relative font-display text-balance text-4xl font-bold tracking-tight text-white md:text-6xl md:leading-[1.05]"
          >
            {t("title")}
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-base text-white/55">
            {t("subtitle")}
          </p>

          <Link
            href="/app"
            className="group relative mt-10 inline-flex h-14 items-center gap-2 rounded-md px-7 text-[15px] font-semibold text-black transition active:scale-[0.97]"
            style={{
              backgroundImage: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
              boxShadow: "0 16px 48px -8px rgba(34, 211, 238, 0.6)",
            }}
          >
            {t("button")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
