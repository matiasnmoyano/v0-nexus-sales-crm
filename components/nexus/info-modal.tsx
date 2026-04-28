"use client"

import { useState } from "react"
import { Info, Sparkles, Workflow, Target, Compass, Settings } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

export function InfoModal() {
  const t = useTranslations("infoModal")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("open")}
          className="size-8 bg-card text-muted-foreground hover:text-foreground"
        >
          <Info className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
            <Sparkles className="size-3.5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("title")}</DialogDescription>
        </DialogHeader>

        <Accordion
          type="single"
          collapsible
          defaultValue="how-it-works"
          className="px-6 pb-2 pt-1"
        >
          <AccordionItem value="what-is" className="border-border">
            <AccordionTrigger className="gap-3 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-muted-foreground" />
                {t("sections.whatIs.title")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {t("sections.whatIs.body")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="how-it-works" className="border-border">
            <AccordionTrigger className="gap-3 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Workflow className="size-3.5 text-muted-foreground" />
                {t("sections.howItWorks.title")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {[1, 2, 3, 4, 5].map((n) => (
                  <li key={n} className="flex gap-2.5">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-card font-mono text-[10px] tabular-nums text-muted-foreground">
                      {n}
                    </span>
                    <span className="text-pretty">
                      {t(`sections.howItWorks.step${n}` as `sections.howItWorks.step1`)}
                    </span>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lead-score" className="border-border">
            <AccordionTrigger className="gap-3 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Target className="size-3.5 text-muted-foreground" />
                {t("sections.leadScore.title")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                {t("sections.leadScore.intro")}
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n} className="flex gap-2.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                    <span className="text-pretty">
                      {t(
                        `sections.leadScore.criteria${n}` as `sections.leadScore.criteria1`,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="philosophy" className="border-border">
            <AccordionTrigger className="gap-3 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Compass className="size-3.5 text-muted-foreground" />
                {t("sections.philosophy.title")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {t("sections.philosophy.body")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="config" className="border-b-0">
            <AccordionTrigger className="gap-3 py-3 text-sm">
              <span className="flex items-center gap-2">
                <Settings className="size-3.5 text-muted-foreground" />
                {t("sections.config.title")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {t("sections.config.body")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter className="border-t border-border px-6 py-3">
          <DialogClose asChild>
            <Button variant="outline" className="font-mono text-xs">
              {t("close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
