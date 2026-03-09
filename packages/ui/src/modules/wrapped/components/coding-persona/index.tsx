"use client";

import type { WrappedData } from "@/generated/typeshare-types";

interface Persona {
  title: string;
  subtitle: string;
  emoji: string;
}

function derivePersona(data: WrappedData): Persona {
  const avgMinPerSession =
    (data.totalActiveHours / Math.max(data.totalSessions, 1)) * 60;
  const isNight = data.peakHour >= 22 || data.peakHour < 5;
  const isEarlyBird = data.peakHour >= 5 && data.peakHour < 9;
  const hasHighOutput = data.linesOfCodeAdded + data.linesOfCodeRemoved > 5000;
  const hasLongSessions = avgMinPerSession > 40;
  const hasShortSessions = avgMinPerSession < 15 && data.totalSessions > 5;
  const hasLongStreak = data.longestStreakDays >= 5;

  if (isNight && data.commits > 5) {
    return {
      title: "Night Owl Shipper",
      subtitle: "Ships code while the world sleeps",
      emoji: "🦉",
    };
  }
  if (isEarlyBird && data.commits > 3) {
    return {
      title: "Dawn Deployer",
      subtitle: "First commit before first coffee",
      emoji: "🌅",
    };
  }
  if (hasHighOutput && hasLongSessions) {
    return {
      title: "Code Machine",
      subtitle: "Built more than most teams",
      emoji: "⚡",
    };
  }
  if (hasShortSessions) {
    return {
      title: "Rapid Prototyper",
      subtitle: "Move fast, iterate faster",
      emoji: "🚀",
    };
  }
  if (hasLongSessions) {
    return {
      title: "Deep Diver",
      subtitle: "Goes deep, stays focused",
      emoji: "🤿",
    };
  }
  if (hasLongStreak) {
    return {
      title: "Streak Master",
      subtitle: "Consistency is your superpower",
      emoji: "🔥",
    };
  }
  if (isNight) {
    return {
      title: "Night Owl",
      subtitle: "Best ideas come after midnight",
      emoji: "🌙",
    };
  }
  return {
    title: "Vibe Coder",
    subtitle: "Coding with Claude, one prompt at a time",
    emoji: "✨",
  };
}

export function CodingPersona({ data }: { data: WrappedData }) {
  const persona = derivePersona(data);

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-3xl">{persona.emoji}</span>
      <p className="text-lg font-bold">{persona.title}</p>
      <p className="text-xs text-muted-foreground">{persona.subtitle}</p>
    </div>
  );
}
