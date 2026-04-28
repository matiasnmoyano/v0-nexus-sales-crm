"use client"

import { useEffect, useState, useTransition } from "react"
import { Plus, Save, Trash2, X } from "lucide-react"
import { updateAgencyConfig } from "@/app/actions"
import type { AgencyCaseStudy, AgencyConfig, AgencyService } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  agency: AgencyConfig
  onSaved: (next: AgencyConfig) => void
}

export function AgencyConfigSheet({ open, onOpenChange, agency, onSaved }: Props) {
  const [name, setName] = useState(agency.name)
  const [description, setDescription] = useState(agency.description)
  const [tone, setTone] = useState(agency.tone)
  const [services, setServices] = useState<AgencyService[]>(agency.services)
  const [caseStudies, setCaseStudies] = useState<AgencyCaseStudy[]>(agency.case_studies)
  const [isPending, startTransition] = useTransition()

  // reset whenever sheet opens with fresh agency
  useEffect(() => {
    if (open) {
      setName(agency.name)
      setDescription(agency.description)
      setTone(agency.tone)
      setServices(agency.services)
      setCaseStudies(agency.case_studies)
    }
  }, [open, agency])

  const handleSave = () => {
    if (!name.trim() || !description.trim() || !tone.trim()) {
      toast.error("Name, description and tone are required")
      return
    }
    startTransition(async () => {
      try {
        const next = await updateAgencyConfig({
          id: agency.id,
          name: name.trim(),
          description: description.trim(),
          tone: tone.trim(),
          services: services.filter((s) => s.title.trim() && s.detail.trim()),
          case_studies: caseStudies.filter((c) => c.title.trim() && c.detail.trim()),
        })
        onSaved(next)
        onOpenChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-xl bg-background p-0"
      >
        <SheetHeader className="border-b border-border bg-sidebar/50 px-6 py-4">
          <SheetTitle className="font-mono text-sm uppercase tracking-wider">
            Agency profile
          </SheetTitle>
          <SheetDescription>
            The Co-Pilot uses this profile to qualify leads and write outreach. Update it and every
            future analysis adapts.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100dvh-8rem)] px-6">
          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="agency-name">Name</FieldLabel>
              <Input
                id="agency-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nexus Labs"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="agency-description">Description</FieldLabel>
              <Textarea
                id="agency-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What you do, who you serve, your value prop."
              />
              <FieldDescription>One short paragraph. Used as the agency briefing.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="agency-tone">Voice / tone</FieldLabel>
              <Textarea
                id="agency-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                rows={2}
                placeholder="e.g. Direct but technical. No fluff, focus on measurable ROI."
              />
              <FieldDescription>
                The Co-Pilot mirrors this tone in every email, LinkedIn DM and WhatsApp.
              </FieldDescription>
            </Field>

            <DynamicListEditor
              label="Services"
              hint="The two main lines you sell. Keep titles short."
              items={services}
              onChange={setServices}
              placeholderTitle="e.g. Custom software"
              placeholderDetail="What it actually delivers in one sentence."
            />

            <DynamicListEditor
              label="Case studies"
              hint="Real wins the Co-Pilot can reference. Keep them factual."
              items={caseStudies}
              onChange={setCaseStudies}
              placeholderTitle="e.g. WhatsApp bot for an agency"
              placeholderDetail="The outcome — automated 70% of intake, freed sales team."
            />
          </FieldGroup>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-sidebar/50 px-6 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-1.5 font-mono">
            <Save className="size-3.5" />
            {isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DynamicListEditor<T extends { title: string; detail: string }>({
  label,
  hint,
  items,
  onChange,
  placeholderTitle,
  placeholderDetail,
}: {
  label: string
  hint: string
  items: T[]
  onChange: (next: T[]) => void
  placeholderTitle: string
  placeholderDetail: string
}) {
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel asChild>
          <span>{label}</span>
        </FieldLabel>
        <button
          type="button"
          onClick={() => onChange([...items, { title: "", detail: "" } as T])}
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>
      <FieldDescription>{hint}</FieldDescription>
      <div className="mt-2 space-y-2">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
            None yet — click <span className="font-mono">Add</span> to create one.
          </div>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={item.title}
                  onChange={(e) => {
                    const next = [...items]
                    next[idx] = { ...next[idx], title: e.target.value }
                    onChange(next)
                  }}
                  placeholder={placeholderTitle}
                  className="h-8 text-sm"
                />
                <Textarea
                  value={item.detail}
                  onChange={(e) => {
                    const next = [...items]
                    next[idx] = { ...next[idx], detail: e.target.value }
                    onChange(next)
                  }}
                  placeholder={placeholderDetail}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="rounded-sm p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Field>
  )
}
