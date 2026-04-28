"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { fadeInUp, viewportOnce } from "@/lib/motion-variants"

const FAQ_KEYS = ["noAuto", "privacy", "score", "customize", "models", "pricing"] as const

export function Faq() {
  const t = useTranslations("landing.faq")

  return (
    <section
      id="faq"
      className="relative scroll-mt-24 py-24 md:py-32"
      aria-labelledby="faq-title"
    >
      <div className="mx-auto w-full max-w-3xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="text-center"
        >
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300/70">
            {t("kicker")}
          </p>
          <h2
            id="faq-title"
            className="font-display text-balance text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            {t("title")}
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="mt-12"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_KEYS.map((key) => (
              <AccordionItem
                key={key}
                value={key}
                className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 backdrop-blur-md data-[state=open]:border-cyan-400/20"
              >
                <AccordionTrigger className="py-4 text-left text-[15px] font-medium text-white hover:no-underline [&>svg]:text-cyan-300">
                  {t(`items.${key}.q`)}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[14px] leading-relaxed text-white/65">
                  {t(`items.${key}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
