/**
 * Number formatting utilities (Grafana-style auto scaling)
 */

export type FormatType =
  | "number"      // Plain number (1000 -> 1K)
  | "bytes"       // Bytes (1024 -> 1 KB)
  | "duration"    // Duration in seconds (3600 -> 1h)
  | "durationMs"  // Duration in milliseconds (60000 -> 1m)
  | "currency"    // Currency (1000 -> $1K)
  | "percent";    // Percentage (0.5 -> 50%)

interface FormatOptions {
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

interface FormatResult {
  value: string;
  unit: string;
  full: string;
}

const NUMBER_UNITS = [
  { threshold: 1e12, unit: "T", divisor: 1e12 },
  { threshold: 1e9, unit: "B", divisor: 1e9 },
  { threshold: 1e6, unit: "M", divisor: 1e6 },
  { threshold: 1e3, unit: "K", divisor: 1e3 },
  { threshold: 1, unit: "", divisor: 1 },
];

const BYTE_UNITS = [
  { threshold: 1024 ** 4, unit: "TB", divisor: 1024 ** 4 },
  { threshold: 1024 ** 3, unit: "GB", divisor: 1024 ** 3 },
  { threshold: 1024 ** 2, unit: "MB", divisor: 1024 ** 2 },
  { threshold: 1024, unit: "KB", divisor: 1024 },
  { threshold: 1, unit: "B", divisor: 1 },
];

const DURATION_UNITS = [
  { threshold: 86400, unit: "d", divisor: 86400 },
  { threshold: 3600, unit: "h", divisor: 3600 },
  { threshold: 60, unit: "m", divisor: 60 },
  { threshold: 1, unit: "s", divisor: 1 },
];

const DURATION_MS_UNITS = [
  { threshold: 86400000, unit: "d", divisor: 86400000 },
  { threshold: 3600000, unit: "h", divisor: 3600000 },
  { threshold: 60000, unit: "m", divisor: 60000 },
  { threshold: 1000, unit: "s", divisor: 1000 },
  { threshold: 1, unit: "ms", divisor: 1 },
];

function formatWithUnits(
  value: number,
  units: typeof NUMBER_UNITS,
  decimals: number
): FormatResult {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  for (const { threshold, unit, divisor } of units) {
    if (absValue >= threshold) {
      const scaled = absValue / divisor;
      const formatted = scaled % 1 === 0
        ? scaled.toString()
        : scaled.toFixed(decimals);
      return {
        value: sign + formatted,
        unit,
        full: sign + formatted + unit,
      };
    }
  }

  return { value: sign + "0", unit: "", full: sign + "0" };
}

/**
 * Format a number with auto-scaling units (Grafana-style)
 *
 * @example
 * formatValue(1500, "number")     // { value: "1.5", unit: "K", full: "1.5K" }
 * formatValue(1024, "bytes")      // { value: "1", unit: "KB", full: "1KB" }
 * formatValue(3661, "duration")   // { value: "1", unit: "h", full: "1h" }
 * formatValue(1500, "currency")   // { value: "1.5", unit: "K", full: "$1.5K" }
 * formatValue(0.156, "percent")   // { value: "15.6", unit: "%", full: "15.6%" }
 */
export function formatValue(
  value: number,
  type: FormatType = "number",
  options: FormatOptions = {}
): FormatResult {
  const { decimals = 1, prefix = "", suffix = "" } = options;

  if (value === 0 || !Number.isFinite(value)) {
    const zero = type === "currency" ? "$0" : "0";
    const unit = type === "percent" ? "%" : "";
    return { value: "0", unit, full: prefix + zero + unit + suffix };
  }

  let result: FormatResult;

  switch (type) {
    case "bytes":
      result = formatWithUnits(value, BYTE_UNITS, decimals);
      break;

    case "duration":
      result = formatWithUnits(value, DURATION_UNITS, 0);
      break;

    case "durationMs":
      result = formatWithUnits(value, DURATION_MS_UNITS, 0);
      break;

    case "currency": {
      const numResult = formatWithUnits(value, NUMBER_UNITS, decimals);
      return {
        value: numResult.value,
        unit: numResult.unit,
        full: prefix + "$" + numResult.value + numResult.unit + suffix,
      };
    }

    case "percent": {
      const pctValue = value * 100;
      const formatted = pctValue % 1 === 0
        ? pctValue.toString()
        : pctValue.toFixed(decimals);
      return {
        value: formatted,
        unit: "%",
        full: prefix + formatted + "%" + suffix,
      };
    }

    case "number":
    default:
      result = formatWithUnits(value, NUMBER_UNITS, decimals);
      break;
  }

  return {
    value: result.value,
    unit: result.unit,
    full: prefix + result.full + suffix,
  };
}

/**
 * Shorthand for getting just the formatted string
 */
export function fmt(
  value: number,
  type: FormatType = "number",
  options: FormatOptions = {}
): string {
  return formatValue(value, type, options).full;
}

/**
 * Format duration with mixed units (e.g., "1h 30m")
 */
export function formatDurationMixed(seconds: number): string {
  if (seconds <= 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);

  return parts.length > 0 ? parts.join(" ") : "0s";
}

/**
 * Format relative time (e.g., "5 min ago")
 */
export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
