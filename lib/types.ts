export type LeadStatus = "analyzed" | "contacted" | "follow_up" | "meeting" | "discarded"
export type SuggestedSolution = "automation" | "custom_software"
export type Channel = "email" | "linkedin" | "whatsapp"
export type MessageType = "initial" | "followup_d3" | "followup_d7"

export interface ScoreBreakdown {
  digital_pain: number
  buying_capacity: number
  service_fit: number
  reason: string
}

export interface DetectedProblem {
  title: string
  evidence: string
}

export interface AgencyService {
  title: string
  detail: string
}

export interface AgencyCaseStudy {
  title: string
  detail: string
}

export interface AgencyConfig {
  id: string
  name: string
  description: string
  services: AgencyService[]
  case_studies: AgencyCaseStudy[]
  tone: string
  updated_at: string
}

export interface Lead {
  id: string
  company_name: string
  url: string | null
  industry: string | null
  detected_problems: DetectedProblem[]
  suggested_solution: SuggestedSolution
  solution_justification: string
  lead_score: number
  score_breakdown: ScoreBreakdown
  status: LeadStatus
  raw_scrape_data: unknown
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  lead_id: string
  channel: Channel
  type: MessageType
  content: string
  created_at: string
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  analyzed: "Analyzed",
  contacted: "Contacted",
  follow_up: "Follow-up",
  meeting: "Meeting booked",
  discarded: "Discarded",
}

export const STATUS_ORDER: LeadStatus[] = ["analyzed", "contacted", "follow_up", "meeting", "discarded"]

export const SOLUTION_LABELS: Record<SuggestedSolution, string> = {
  automation: "Automation",
  custom_software: "Custom software",
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
}

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  initial: "Initial outreach",
  followup_d3: "Follow-up · day 3",
  followup_d7: "Follow-up · day 7",
}
