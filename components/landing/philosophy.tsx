"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Check, X } from "lucide-react"
import { fadeInUp, slideFromLeft, slideFromRight, staggerChildren, viewportOnce } from "@/lib/motion-variants"

export function Philosophy() {
  const t = useTranslations("landing.philosophy")
  const othersList = t.raw("othersList") as string[]
  const ourList = t.raw("ourList") as string[]

  return (
    <section className="relative py-24 md:py-32" aria-labelledby="philosophy-title">
      <div className="mx-auto w-full max-w-5xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren}
        >
          <motion.p
            variants={fadeInUp}
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/70"
          >
            {t("kicker")}
          </motion.p>
          <motion.h2
            id="philosophy-title"
            variants={fadeInUp}
            className="font-display text-balance text-3xl font-bold tracking-tight text-white md:text-5xl md:leading-[1.08]"
          >
            {t("title")}
          </motion.h2>
          <motion.div variants={fadeInUp} className="mt-8 max-w-2xl space-y-4 text-[16px] leading-relaxed text-white/60">
            <p>{t("body1")}</p>
            <p>{t("body2")}</p>
            <p className="text-white/85">{t("body3")}</p>
          </motion.div>
        </motion.div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 md:gap-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={slideFromLeft}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md"
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              {t("othersTitle")}
            </p>
            <ul className="space-y-3">
              {othersList.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-white/45">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border border-white/10 bg-white/[0.02]">
                    <X className="size-3 text-white/30" strokeWidth={2.5} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={slideFromRight}
            className="relative rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 to-violet-400/5 p-6 backdrop-blur-md"
            style={{ boxShadow: "0 16px 48px -12px rgba(34, 211, 238, 0.15)" }}
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300/70">
              {t("ourTitle")}
            </p>
            <ul className="space-y-3">
              {ourList.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-white/85">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
