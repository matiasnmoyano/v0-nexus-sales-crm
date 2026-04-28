"use client"

import { LazyMotion, domAnimation } from "framer-motion"

/**
 * Wraps the landing tree in LazyMotion with the lighter `domAnimation`
 * feature bundle, which keeps Framer Motion's runtime cost down compared
 * to the default `domMax` features.
 */
export function LazyMotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>
}
