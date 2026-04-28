"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Building2, Briefcase, Users } from "lucide-react"
import { fadeInUp, staggerChildren, viewportOnce } from "@/lib/motion-variants"

const CASES = [
  { key: "agencies", Icon: Building2 },
  { key: "freelancers", Icon: Briefcase },
  { key: "teams", Icon: Users },
] as const

export function UseCases() {
  const t = useTranslations("landing.useCases")

  return (
    <section className="relative py-24 md:py-32" aria-labelledby="cases-title">
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
            id="cases-title"
            className="font-display text-balance text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            {t("title")}
          </h2>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren}
          className="mt-14 grid gap-4 md:grid-cols-3 md:gap-6"
        >
          {CASES.map(({ key, Icon }) => (
            <motion.li
              key={key}
              variants={fadeInUp}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 backdrop-blur-md transition hover:border-cyan-400/20"
            >
              <span className="mb-5 grid size-11 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-cyan-300">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="font-display text-xl font-semibold text-white">
                {t(`${key}.title`)}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/60">
                {t(`${key}.desc`)}
              </p>
              <p className="mt-5 border-t border-white/[0.06] pt-3 font-mono text-[11px] text-white/40">
                {t(`${key}.example`)}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
