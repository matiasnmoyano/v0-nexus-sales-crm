"use client"

import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { useTranslations } from "next-intl"
import { ArrowUpRight, Brain, Layers3, Send } from "lucide-react"
import { fadeInUp, staggerChildren, viewportOnce } from "@/lib/motion-variants"

/**
 * Dashboard preview — a stylised, animated mock of the actual three-panel
 * Nexus Sales workspace. We render it with HTML/CSS rather than a screenshot
 * so it stays sharp at any DPI and animates with the rest of the page.
 */
export function Showcase() {
  const t = useTranslations("landing.showcase")
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  // Subtle parallax — the canvas drifts slower than the rest of the section.
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])

  const annotations = [
    { side: "left", top: "18%", icon: Brain, key: "streaming" },
    { side: "right", top: "44%", icon: Send, key: "channels" },
    { side: "left", top: "72%", icon: Layers3, key: "pipeline" },
  ] as const

  return (
    <section className="relative py-24 md:py-32" aria-labelledby="showcase-title">
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
            id="showcase-title"
            className="font-display text-balance text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            {t("title")}
          </h2>
        </motion.div>

        <div ref={ref} className="relative mt-16 px-2 md:px-12">
          <motion.div
            style={{ y }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0e18]/80 shadow-[0_40px_120px_-20px_rgba(34,211,238,0.18)] backdrop-blur-xl"
          >
            {/* Faux window chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <div className="ml-3 flex h-5 items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 font-mono text-[10px] text-white/40">
                <span className="text-cyan-300/70">●</span>
                nexus-sales.app/app
              </div>
              <span className="ml-auto font-mono text-[10px] text-white/30">
                {t("liveLabel")}
              </span>
            </div>

            {/* Three-panel mock */}
            <div className="grid grid-cols-12 gap-px bg-white/[0.04]">
              {/* Pipeline panel */}
              <div className="col-span-3 bg-[#0b0e18] p-3">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/40">
                  Pipeline
                </p>
                {["Analyzed", "Contacted", "Follow-up"].map((stage, i) => (
                  <div key={stage} className="mb-3">
                    <p className="mb-1.5 text-[10px] font-medium text-white/60">{stage}</p>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={viewportOnce}
                      transition={{ delay: i * 0.1 + 0.2 }}
                      className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-white/85">
                          {["Acme Inc.", "Globex", "Initech"][i]}
                        </span>
                        <span className="rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-1 font-mono text-[8px] text-cyan-300">
                          {[87, 73, 64][i]}
                        </span>
                      </div>
                      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${[87, 73, 64][i]}%`,
                            backgroundImage:
                              "linear-gradient(90deg, #22d3ee, #a78bfa)",
                          }}
                        />
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Lead detail panel */}
              <div className="col-span-5 bg-[#0a0d16] p-3">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-white/40">
                  {t("mock.lead")}
                </p>
                <p className="text-sm font-semibold text-white">Acme Inc.</p>
                <p className="text-[11px] text-white/40">Logistics · ES</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["pain", "capacity", "fit"].map((k, i) => (
                    <div
                      key={k}
                      className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2"
                    >
                      <p className="font-mono text-[8px] uppercase tracking-wider text-white/40">
                        {t(`mock.${k}`)}
                      </p>
                      <p className="mt-1 font-display text-base font-bold text-white">
                        {[88, 72, 91][i]}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ width: 0 }}
                      whileInView={{ width: ["80%", "65%", "92%"][i - 1] }}
                      viewport={viewportOnce}
                      transition={{ delay: i * 0.15 + 0.3, duration: 0.6 }}
                      className="h-1 rounded-full bg-white/[0.06]"
                    />
                  ))}
                </div>
              </div>

              {/* Co-pilot panel */}
              <div className="col-span-4 bg-[#0a0d16] p-3">
                <p className="mb-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-cyan-300/70">
                  <span className="size-1 rounded-full bg-cyan-400 nexus-pulse-dot" />
                  Co-Pilot · {t("mock.streaming")}
                </p>
                <div className="space-y-1.5 font-mono text-[9px] leading-snug text-white/70">
                  {[
                    "› scrape_website('acme.com')",
                    "  ✓ 12 pages indexed",
                    "› analyze_signals(...)",
                    "  ✓ pain_score: 88",
                    "› generate_outreach(es)",
                  ].map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={viewportOnce}
                      transition={{ delay: i * 0.12 + 0.3 }}
                    >
                      {line}
                    </motion.p>
                  ))}
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={viewportOnce}
                    transition={{ delay: 1 }}
                    className="inline-block size-1.5 bg-cyan-400 nexus-pulse-dot"
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: 1.2 }}
                  className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/[0.04] p-2"
                >
                  <p className="font-mono text-[8px] uppercase tracking-wider text-cyan-300/70">
                    Email · Initial
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-white/75">
                    Hola Diego, vi que Acme tiene 4 depósitos sincronizados a mano…
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Annotations */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren}
            className="pointer-events-none absolute inset-0 hidden md:block"
            aria-hidden="true"
          >
            {annotations.map((a) => {
              const Icon = a.icon
              return (
                <motion.div
                  key={a.key}
                  variants={fadeInUp}
                  className="absolute flex items-center gap-2 rounded-full border border-cyan-400/20 bg-[#0b0e18]/90 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-md"
                  style={{
                    [a.side]: "-12px",
                    top: a.top,
                    transform: a.side === "right" ? "translateX(50%)" : "translateX(-50%)",
                    boxShadow: "0 8px 24px -8px rgba(34, 211, 238, 0.4)",
                  }}
                >
                  <Icon className="size-3.5 text-cyan-300" />
                  {t(`annotations.${a.key}`)}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {t("cta")} <ArrowUpRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
