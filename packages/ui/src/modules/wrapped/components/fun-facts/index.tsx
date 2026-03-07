"use client";

import type { WrappedData } from "@/generated/typeshare-types";

interface FunFact {
  emoji: string;
  text: string;
}

function deriveFacts(data: WrappedData): FunFact[] {
  const facts: FunFact[] = [];

  // Time equivalents
  const totalMinutes = data.totalActiveHours * 60;
  if (totalMinutes >= 120) {
    const movies = Math.floor(totalMinutes / 120);
    facts.push({
      emoji: "🎬",
      text: `Enough time to watch ${movies} movie${movies > 1 ? "s" : ""}`,
    });
  } else if (totalMinutes >= 45) {
    const episodes = Math.floor(totalMinutes / 45);
    facts.push({
      emoji: "📺",
      text: `Enough time to binge ${episodes} TV episode${episodes > 1 ? "s" : ""}`,
    });
  }

  // Cost equivalents (assuming ~$5 per coffee)
  if (data.totalCost >= 5) {
    const coffees = Math.floor(data.totalCost / 5);
    facts.push({
      emoji: "☕",
      text: `That's ${coffees} cup${coffees > 1 ? "s" : ""} of coffee`,
    });
  }

  // Lines of code equivalents (~50 lines per printed page)
  const totalLines = data.linesOfCodeAdded + data.linesOfCodeRemoved;
  if (totalLines >= 500) {
    const pages = Math.floor(totalLines / 50);
    facts.push({
      emoji: "📄",
      text: `${pages} printed page${pages > 1 ? "s" : ""} of code`,
    });
  }

  return facts.slice(0, 3);
}

export function FunFacts({ data }: { data: WrappedData }) {
  const facts = deriveFacts(data);

  if (facts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {facts.map((fact, i) => (
        <span key={i} className="text-xs text-muted-foreground">
          {fact.emoji} {fact.text}
        </span>
      ))}
    </div>
  );
}
