"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fadeInUp, staggerChildren } from "@/lib/motion-variants"

type PhaseId = "search" | "scrape" | "analyze" | "score"
type PhaseStatus = "idle" | "active" | "done"

interface DemoResult {
  score: number
  solution: "automation" | "custom_software"
  industry: string
  problems: { title: string; evidence: string }[]
  copyPreview: string
  truncated: boolean
  remaining: number
  url: string
  title: string
}

const PHASES: { id: PhaseId; key: string }[] = [
  { id: "search", key: "search" },
  { id: "scrape", key: "scrape" },
  { id: "analyze", key: "analyze" },
  { id: "score", key: "score" },
]

const SUGGESTIONS = ["stripe.com", "linear.app", "notion.so", "framer.com"]

/**
 * Custom SSE parser. EventSource doesn't support POST, so we drive the
 * connection with `fetch` and walk the byte stream manually.
 */
async function* parseSSE(res: Response) {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      let event = "message"
      let data = ""
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) data += line.slice(5).trim()
      }
      if (data) {
        try {
          yield { event, data: JSON.parse(data) }
        } catch {
          /* skip */
        }
      }
    }
  }
}

function CountUpScore({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: 1.2, bounce: 0 })
  const display = useTransform(spring, (latest) => Math.round(latest))
  const [text, setText] = useState("0")

  useEffect(() => {
    motionValue.set(value)
    const unsub = display.on("change", (v) => setText(String(v)))
    return () => unsub()
  }, [value, motionValue, display])

  return <span className="tabular-nums">{text}</span>
}

export function HeroDemo() {
  const t = useTranslations("landing.hero.demo")
  const tResult = useTranslations("landing.hero.demo.result")
  const tNav = useTranslations("landing.nav")
  const locale = useLocale()
  const [input, setInput] = useState("")
  const [phases, setPhases] = useState<Record<PhaseId, PhaseStatus>>({
    search: "idle",
    scrape: "idle",
    analyze: "idle",
    score: "idle",
  })
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DemoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tookLong, setTookLong] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const reset = () => {
    setPhases({ search: "idle", scrape: "idle", analyze: "idle", score: "idle" })
    setResult(null)
    setError(null)
    setTookLong(false)
  }

  const run = async (raw: string) => {
    const url = raw.trim()
    if (!url || running) return
    reset()
    setRunning(true)

    const slowTimer = setTimeout(() => setTookLong(true), 8000)
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch("/api/demo-analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, locale }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `HTTP ${res.status}`)
        return
      }

      for await (const { event, data } of parseSSE(res)) {
        if (event === "phase") {
          setPhases((p) => ({ ...p, [data.id as PhaseId]: data.status as PhaseStatus }))
        } else if (event === "result") {
          setResult(data as DemoResult)
        } else if (event === "error") {
          setError(data.message)
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      clearTimeout(slowTimer)
      setRunning(false)
      setTookLong(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    run(input)
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="landing-border-glow relative w-full overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl"
      style={{ boxShadow: "0 24px 64px -12px rgba(34, 211, 238, 0.18)" }}
    >
      {/* Live demo badge */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
        <span className="size-1.5 rounded-full bg-cyan-400 nexus-pulse-dot" />
        {t("liveBadge")}
      </div>

      <div className="mb-5">
        <p className="mb-3 text-[13px] font-medium text-white/70">{t("title")}</p>
        <form onSubmit={onSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholder")}
              disabled={running}
              className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <button
            type="submit"
            disabled={running || !input.trim()}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundImage: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
              boxShadow: "0 8px 24px -8px rgba(34, 211, 238, 0.5)",
            }}
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {t("analyzeButton")}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {!running && !result && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-white/40">{t("suggestions")}:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInput(s)
                  run(s)
                }}
                disabled={running}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Phases stepper */}
      <ol className="space-y-2.5">
        {PHASES.map((phase) => {
          const status = phases[phase.id]
          return (
            <li key={phase.id} className="flex items-center gap-3 font-mono text-[12px]">
              <motion.span
                animate={{
                  scale: status === "active" ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 1, repeat: status === "active" ? Infinity : 0 }}
                className={cn(
                  "grid size-5 place-items-center rounded-sm border transition-colors",
                  status === "done" && "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
                  status === "active" && "border-cyan-400/60 bg-cyan-400/20 text-cyan-200",
                  status === "idle" && "border-white/10 bg-white/[0.02] text-white/30",
                )}
                aria-label={status}
              >
                {status === "done" ? (
                  <CheckCircle2 className="size-3.5" strokeWidth={2.5} />
                ) : status === "active" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="text-[8px]">◇</span>
                )}
              </motion.span>
              <span
                className={cn(
                  "transition-colors",
                  status === "idle" ? "text-white/30" : "text-white/85",
                )}
              >
                {t(`phases.${phase.key}`)}
              </span>
              {status === "active" && (
                <span className="ml-auto font-mono text-[10px] text-cyan-300/70">
                  {t("processing")}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {tookLong && !result && !error && (
        <p className="mt-3 flex items-start gap-2 text-[11px] text-white/40">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          {t("slowHint")}
        </p>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={staggerChildren}
            className="mt-5 space-y-3 border-t border-white/[0.06] pt-5"
          >
            <motion.div variants={fadeInUp} className="flex items-end gap-4">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-5xl font-extrabold leading-none landing-gradient-text">
                  <CountUpScore value={result.score} />
                </span>
                <span className="font-mono text-xs text-white/40">/100</span>
              </div>
              <div className="flex-1 pb-1.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                  {tResult("score")}
                </p>
                <p className="text-[13px] font-medium text-white/85">
                  {result.title}
                  <span className="text-white/40"> · {result.industry}</span>
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
                  result.solution === "automation"
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                    : "border-violet-400/30 bg-violet-400/10 text-violet-300",
                )}
              >
                {tResult(`solution.${result.solution}`)}
              </span>
            </motion.div>

            <motion.ul variants={fadeInUp} className="space-y-1.5 text-[12px]">
              {result.problems.slice(0, 2).map((p, i) => (
                <li key={i} className="flex gap-2 text-white/70">
                  <Sparkles className="mt-0.5 size-3 shrink-0 text-cyan-300/80" />
                  <span>
                    <span className="font-medium text-white/90">{p.title}.</span>{" "}
                    <span className="text-white/50">{p.evidence}</span>
                  </span>
                </li>
              ))}
            </motion.ul>

            <motion.div
              variants={fadeInUp}
              className="rounded-lg border border-white/[0.06] bg-black/20 p-3 font-mono text-[11px] leading-relaxed text-white/75"
            >
              <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
                <Search className="size-3" /> {tResult("copyPreview")}
              </p>
              <p className="whitespace-pre-line">{result.copyPreview}</p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-between pt-1">
              <span className="font-mono text-[10px] text-white/30">
                {t("remaining", { count: result.remaining })}
              </span>
              <Link
                href="/app"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                {t("viewFullCopy")} <ArrowUpRight className="size-3" />
              </Link>
            </motion.div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-[12px]"
          >
            <p className="flex items-start gap-2 text-amber-200/90">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-300 transition hover:text-amber-200"
            >
              {tNav("openApp")} <ArrowUpRight className="size-3" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
