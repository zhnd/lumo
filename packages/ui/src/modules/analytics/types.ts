export {
  type ModelStats,
  type Session,
  type SummaryStats,
  TimeRange,
} from "@/generated/typeshare-types";

export type RestStatus = "rested" | "heads-up" | "take-a-break";

export interface RestState {
  continuousCodingMinutes: number;
  status: RestStatus;
  progressPercent: number;
}

export interface RestPreferences {
  headsUpMinutes: number;
  breakMinutes: number;
}

export interface HourlyData {
  hour: number;
  label: string;
  sessionCount: number;
  totalDurationMin: number;
}

export interface EfficiencyScores {
  cacheRate: number;
  costPerSession: number;
  editAcceptRate: number;
}

export interface CostInsight {
  label: string;
  value: string;
  tip?: string;
}

export interface HealthInsight {
  icon: "moon" | "stretch" | "trophy" | "clock";
  title: string;
  detail: string;
  severity: "info" | "warning" | "success";
}

export interface HealthStats {
  latestWorkHour: number | null;
  longestContinuousMin: number;
  insights: HealthInsight[];
}

export interface WeekDelta {
  label: string;
  current: number;
  previous: number;
  changePercent: number;
  format: "number" | "currency" | "duration";
}
