import type {
  Session,
  SummaryStats,
  ModelStats,
  RestState,
  RestPreferences,
  HourlyData,
  EfficiencyScores,
  CostInsight,
  WeekDelta,
  HealthStats,
  HealthInsight,
} from "./types";
import { CONTINUOUS_GAP_THRESHOLD_MIN } from "./constants";

export function computeRestState(
  sessions: Session[],
  prefs: RestPreferences
): RestState {
  if (sessions.length === 0) {
    return { continuousCodingMinutes: 0, status: "rested", progressPercent: 0 };
  }

  const now = Date.now();
  const sorted = [...sessions].sort((a, b) => b.endTime - a.endTime);
  const gapMs = CONTINUOUS_GAP_THRESHOLD_MIN * 60 * 1000;

  let continuousEnd = sorted[0].endTime;
  let continuousStart = sorted[0].startTime;

  // If the most recent session ended more than the gap threshold ago, user is rested
  if (now - continuousEnd > gapMs) {
    return { continuousCodingMinutes: 0, status: "rested", progressPercent: 0 };
  }

  // Walk backwards through sessions to find continuous coding stretch
  for (let i = 1; i < sorted.length; i++) {
    const gap = continuousStart - sorted[i].endTime;
    if (gap > gapMs) break;
    continuousStart = sorted[i].startTime;
  }

  const minutes = (now - continuousStart) / 60000;
  const status =
    minutes >= prefs.breakMinutes
      ? "take-a-break"
      : minutes >= prefs.headsUpMinutes
        ? "heads-up"
        : "rested";
  const progressPercent = Math.min(
    100,
    (minutes / prefs.breakMinutes) * 100
  );

  return {
    continuousCodingMinutes: Math.round(minutes),
    status,
    progressPercent,
  };
}

export function computeHourlyDistribution(sessions: Session[]): HourlyData[] {
  const hours: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, "0")}:00`,
    sessionCount: 0,
    totalDurationMin: 0,
  }));

  for (const s of sessions) {
    const hour = new Date(s.startTime).getHours();
    hours[hour].sessionCount++;
    hours[hour].totalDurationMin += s.durationMs / 60000;
  }

  return hours;
}

export function findPeakHour(data: HourlyData[]): number {
  let max = 0;
  let peak = 0;
  for (const d of data) {
    if (d.sessionCount > max) {
      max = d.sessionCount;
      peak = d.hour;
    }
  }
  return peak;
}

export function computeEfficiency(stats: SummaryStats): EfficiencyScores {
  const totalEdits = stats.codeEditAccepts + stats.codeEditRejects;
  return {
    cacheRate: stats.cachePercentage,
    costPerSession:
      stats.totalSessions > 0 ? stats.totalCost / stats.totalSessions : 0,
    editAcceptRate: totalEdits > 0 ? (stats.codeEditAccepts / totalEdits) * 100 : 0,
  };
}

export function computeCostInsights(
  stats: SummaryStats,
  models: ModelStats[]
): CostInsight[] {
  const insights: CostInsight[] = [];

  const costPerSession =
    stats.totalSessions > 0 ? stats.totalCost / stats.totalSessions : 0;
  insights.push({
    label: "Cost per Session",
    value: `$${costPerSession.toFixed(3)}`,
  });

  const totalTokens = stats.totalTokens || 1;
  const costPerKToken = (stats.totalCost / totalTokens) * 1000;
  insights.push({
    label: "Cost per 1K Tokens",
    value: `$${costPerKToken.toFixed(4)}`,
  });

  if (stats.activeTimeSeconds > 0) {
    const hours = stats.activeTimeSeconds / 3600;
    const costPerHour = stats.totalCost / hours;
    insights.push({
      label: "Cost per Hour",
      value: `$${costPerHour.toFixed(2)}`,
    });
  }

  // Model comparison
  const sorted = [...models].sort((a, b) => b.cost - a.cost);
  if (sorted.length >= 2) {
    const expensive = sorted[0];
    const cheap = sorted[sorted.length - 1];
    if (expensive.cost > cheap.cost) {
      insights.push({
        label: "Model Cost Gap",
        value: `${expensive.displayName}: $${expensive.cost.toFixed(2)}`,
        tip: `${cheap.displayName} costs $${cheap.cost.toFixed(2)} — consider using it more for simple tasks`,
      });
    }
  }

  return insights;
}

export function computeHealthInsights(sessions: Session[]): HealthStats {
  if (sessions.length === 0) {
    return { latestWorkHour: null, longestContinuousMin: 0, insights: [] };
  }

  // Find the latest hour someone was still working (across all sessions)
  let latestWorkHour: number | null = null;
  for (const s of sessions) {
    const h = new Date(s.endTime).getHours();
    if (latestWorkHour === null || h > latestWorkHour) {
      latestWorkHour = h;
    }
  }

  // Compute longest continuous coding stretch
  // Group sessions into continuous stretches (gap < 15min)
  const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);
  const gapMs = CONTINUOUS_GAP_THRESHOLD_MIN * 60 * 1000;
  let longestMs = 0;
  let stretchStart = sorted[0].startTime;
  let stretchEnd = sorted[0].endTime;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime - stretchEnd <= gapMs) {
      stretchEnd = Math.max(stretchEnd, sorted[i].endTime);
    } else {
      longestMs = Math.max(longestMs, stretchEnd - stretchStart);
      stretchStart = sorted[i].startTime;
      stretchEnd = sorted[i].endTime;
    }
  }
  longestMs = Math.max(longestMs, stretchEnd - stretchStart);
  const longestContinuousMin = Math.round(longestMs / 60000);

  // Generate actionable insights
  const insights: HealthInsight[] = [];

  // Late night warning
  if (latestWorkHour !== null && latestWorkHour >= 23) {
    insights.push({
      icon: "moon",
      title: "Night owl detected",
      detail: `You worked as late as ${latestWorkHour}:00. Chronic late nights impact focus and health — try wrapping up by 22:00.`,
      severity: "warning",
    });
  } else if (latestWorkHour !== null && latestWorkHour >= 21) {
    insights.push({
      icon: "moon",
      title: "Evening coder",
      detail: `Latest session ended around ${latestWorkHour}:00. Consider setting a wind-down alarm to protect your sleep.`,
      severity: "info",
    });
  }

  // Long continuous stretch
  if (longestContinuousMin >= 180) {
    insights.push({
      icon: "stretch",
      title: "Marathon session",
      detail: `Your longest stretch was ${formatMinutes(longestContinuousMin)}. Stand up and stretch every 45–60 min to reduce strain.`,
      severity: "warning",
    });
  } else if (longestContinuousMin >= 90) {
    insights.push({
      icon: "stretch",
      title: "Long stretch",
      detail: `Longest continuous session: ${formatMinutes(longestContinuousMin)}. A short walk between sessions boosts creativity.`,
      severity: "info",
    });
  }

  // Good habits
  if (longestContinuousMin > 0 && longestContinuousMin < 60) {
    insights.push({
      icon: "trophy",
      title: "Healthy rhythm",
      detail: "Your sessions are well-paced with regular breaks. Keep it up!",
      severity: "success",
    });
  }

  if (latestWorkHour !== null && latestWorkHour < 21) {
    insights.push({
      icon: "trophy",
      title: "Good work-life balance",
      detail: "You're wrapping up before 21:00 — great habit for long-term productivity.",
      severity: "success",
    });
  }

  // Average session length advice
  const avgDuration =
    sessions.reduce((s, x) => s + x.durationMs, 0) / sessions.length / 60000;
  if (avgDuration > 60) {
    insights.push({
      icon: "clock",
      title: "Consider shorter sessions",
      detail: `Average session is ${formatMinutes(Math.round(avgDuration))}. Shorter, focused sessions with clear goals tend to be more productive.`,
      severity: "info",
    });
  }

  return { latestWorkHour, longestContinuousMin, insights };
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function computeWeeklyDelta(
  current: SummaryStats,
  previous: SummaryStats
): WeekDelta[] {
  function pct(cur: number, prev: number): number {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  }

  return [
    {
      label: "Sessions",
      current: current.totalSessions,
      previous: previous.totalSessions,
      changePercent: pct(current.totalSessions, previous.totalSessions),
      format: "number",
    },
    {
      label: "Cost",
      current: current.totalCost,
      previous: previous.totalCost,
      changePercent: pct(current.totalCost, previous.totalCost),
      format: "currency",
    },
    {
      label: "Active Time",
      current: current.activeTimeSeconds,
      previous: previous.activeTimeSeconds,
      changePercent: pct(current.activeTimeSeconds, previous.activeTimeSeconds),
      format: "duration",
    },
  ];
}
