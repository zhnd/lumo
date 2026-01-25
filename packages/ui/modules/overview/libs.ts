// Format duration from milliseconds to human-readable string
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// Format seconds to human-readable active time
export function formatActiveTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format timestamp to relative time string
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

// Format token count to compact string (K, M)
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// Format cost to USD string
export function formatCost(cost: number): string {
  if (cost >= 100) {
    return `$${cost.toFixed(0)}`;
  }
  if (cost >= 10) {
    return `$${cost.toFixed(1)}`;
  }
  return `$${cost.toFixed(2)}`;
}

// Format percentage change with arrow
export function formatChange(percent: number | undefined): string {
  if (percent === undefined) return "";
  const arrow = percent >= 0 ? "↑" : "↓";
  return `${arrow}${Math.abs(percent).toFixed(0)}%`;
}

// Get model display name from full model identifier
export function getModelDisplayName(model: string): string {
  // claude-sonnet-4-5-20250929 -> Sonnet 4.5
  // claude-opus-4-20250514 -> Opus 4
  // claude-haiku-3-5-20250929 -> Haiku 3.5
  const match = model.match(/claude-(\w+)-(\d+)(?:-(\d+))?/);
  if (!match) return model;

  const [, name, major, minor] = match;
  const modelName = name.charAt(0).toUpperCase() + name.slice(1);
  const version = minor ? `${major}.${minor}` : major;

  return `${modelName} ${version}`;
}

// Get terminal display name
export function getTerminalName(type?: string): string {
  if (!type) return "Terminal";

  const names: Record<string, string> = {
    vscode: "VS Code",
    cursor: "Cursor",
    "iterm.app": "iTerm",
    iterm: "iTerm",
    terminal: "Terminal",
    "apple_terminal": "Terminal",
    warp: "Warp",
    hyper: "Hyper",
    tmux: "tmux",
  };

  const key = type.toLowerCase();
  return names[key] ?? type;
}

// Calculate average per session
export function formatAverage(total: number, sessions: number): string {
  if (sessions === 0) return "0";
  const avg = total / sessions;
  return formatActiveTime(avg);
}
