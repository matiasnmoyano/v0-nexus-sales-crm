"use client"

import { useEffect } from "react"
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion"

/**
 * Decorative landing background — two soft radial orbs (cyan + violet) that
 * drift slightly with the cursor, plus a fine dot grid overlay. Pointer-events
 * are off so the layer never interferes with the page.
 *
 * Reduced-motion users get a static layer.
 */
export function BgOrbs() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 14 })
  const sy = useSpring(my, { stiffness: 60, damping: 14 })

  // Cyan orb drifts a little; violet drifts the other way for parallax.
  const cyanX = useTransform(sx, (v) => v * 18)
  const cyanY = useTransform(sy, (v) => v * 18)
  const violetX = useTransform(sx, (v) => v * -22)
  const violetY = useTransform(sy, (v) => v * -22)

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      mx.set(x)
      my.set(y)
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [mx, my])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: "#080B14" }}
    >
      <motion.div
        className="absolute -left-40 -top-40 h-[640px] w-[640px] rounded-full blur-3xl"
        style={{
          x: cyanX,
          y: cyanY,
          backgroundImage: "radial-gradient(circle at center, rgba(34,211,238,0.28), transparent 60%)",
        }}
      />
      <motion.div
        className="absolute right-[-220px] top-[260px] h-[720px] w-[720px] rounded-full blur-3xl"
        style={{
          x: violetX,
          y: violetY,
          backgroundImage: "radial-gradient(circle at center, rgba(168,85,247,0.22), transparent 60%)",
        }}
      />
      <motion.div
        className="absolute left-1/3 top-[1100px] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          x: cyanX,
          y: cyanY,
          backgroundImage: "radial-gradient(circle at center, rgba(99,102,241,0.18), transparent 60%)",
        }}
      />

      {/* Fine dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.5,
          maskImage:
            "radial-gradient(ellipse at 50% 0%, #000 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, #000 35%, transparent 75%)",
        }}
      />

      {/* Faint horizon line at the very top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    </div>
  )
}
