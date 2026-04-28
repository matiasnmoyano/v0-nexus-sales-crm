"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Bot, Box, Code2, Database, Globe2, Layers, Workflow } from "lucide-react"
import { fadeInUp, staggerChildren, viewportOnce } from "@/lib/motion-variants"

const STACK_ITEMS = [
  { key: "next", Icon: Box, glyph: "▲" },
  { key: "gateway", Icon: Bot, glyph: "✦" },
  { key: "neon", Icon: Database, glyph: "N" },
  { key: "firecrawl", Icon: Globe2, glyph: "F" },
  { key: "exa", Icon: Workflow, glyph: "E" },
  { key: "shadcn", Icon: Layers, glyph: "◆" },
] as const

export function Stack() {
  const t = useTranslations("landing.stack")

  return (
    <section
      id="stack"
      className="relative scroll-mt-24 py-24 md:py-32"
      aria-labelledby="stack-title"
    >
      <div className="mx-auto w-full max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/70">
            <Code2 className="size-3" /> {t("kicker")}
          </p>
          <h2
            id="stack-title"
            className="font-display text-balance text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-white/55">{t("subtitle")}</p>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren}
          className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {STACK_ITEMS.map(({ key, Icon, glyph }) => (
            <motion.li
              key={key}
              variants={fadeInUp}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-cyan-400/25"
              style={{ willChange: "transform" }}
            >
              <div
                aria-hidden="true"
                className="absolute -right-12 -top-12 size-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, rgba(34,211,238,0.35), transparent 60%)",
                }}
              />
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg border border-white/[0.08] bg-black/30 text-cyan-300 transition-colors group-hover:border-cyan-400/30 group-hover:bg-cyan-400/5">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <span className="font-mono text-xs text-white/30">{glyph}</span>
              </div>
              <h3 className="font-display text-base font-semibold text-white">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-white/55">
                {t(`items.${key}.desc`)}
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-cyan-300/70">
                {t(`items.${key}.tag`)}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/35"
        >
          {t("track")}
        </motion.p>
      </div>
    </section>
  )
}
