import type { Variants } from "framer-motion"

/**
 * Variants used across the landing page. Tuned to match the cinematic
 * cyan/violet aesthetic — quick enough to feel responsive, slow enough to
 * read as deliberate.
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
}

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

/** Common viewport options — animate once when the section enters. */
export const viewportOnce = { once: true, margin: "-80px" } as const
