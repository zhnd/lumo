<p align="center">
  <img src="docs/images/logo-rounded.svg" width="80" />
</p>

<h1 align="center">Lumo</h1>

<p align="center">
  A local-first desktop overview for tracking Claude Code usage.<br/>
  Cost, tokens, sessions, and active coding time, all from your own machine.
</p>

<p align="center">
  <a href="docs/README.zh-CN.md">中文文档</a>
</p>

<p align="center">
  <a href="#why-lumo">Why</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#how-it-works">How It Works</a> &bull;
  <a href="#installing-lumo">Install</a> &bull;
  <a href="#developing-from-source">Develop</a> &bull;
  <a href="#macos-installation-troubleshooting">macOS Troubleshooting</a> &bull;
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## Why Lumo?

Claude Code provides powerful assistance, but its usage is difficult to observe in aggregate.

Typical questions are hard to answer:

- How much did I actually spend today or this week?
- Which models or sessions consume most of the cost?
- How long am I actively coding with Claude?
- Am I using caching effectively?
- Do I have long, uninterrupted coding sessions without breaks?

Lumo exists to answer these questions locally, using the data Claude Code already emits.

No accounts.
No cloud dashboards.
No data leaving your machine.

---

## What Lumo Does

Lumo runs a local daemon and desktop app to collect Claude Code telemetry and present it as dashboards.
It stores data in a local SQLite database and renders a native desktop UI (Tauri + Next.js).

The goal is not to analyze your code or conversations,
but to provide clear visibility into usage patterns, cost, and time.

Lumo is built for developers who want to understand:

- where Claude Code time and spend go every day
- which sessions/models are driving most usage
- whether work patterns are sustainable (long streaks, break timing, etc.)

On first launch, Lumo also attempts to configure Claude Code locally so telemetry and hook events are forwarded to the Lumo daemon automatically.

---

## Screenshots

<p align="center">
  <img src="docs/images/overview.jpg" width="900" alt="Lumo overview dashboard" />
</p>

Lumo provides a desktop dashboard for understanding Claude Code usage at a glance:
cost trends, token breakdown, session counts, code changes, and activity heatmaps.

---

## Features

### Overview

An at-a-glance overview of your Claude Code usage:

- Total cost, tokens, lines changed, and session count
- Cost trends by model
- Activity heatmap (last year)
- Time range switching (Today / Week / Month)

<p align="center">
  <img src="docs/images/overview.jpg" width="800" alt="Overview dashboard" />
</p>

---

### Sessions

Browse all Claude Code sessions with full message history:

- Project-based session grouping and filtering
- Session list with project, branch, message count, and updated time
- Session detail view with cost/tokens/duration metadata
- Session highlights (tool calls, tool results, failures, touched files)
- Essential-only mode for dense sessions
- Virtualized message rendering for long transcripts
- Tool call/result blocks, markdown rendering, and raw payload inspection

<p align="center">
  <img src="docs/images/session.jpg" width="800" alt="Session detail view" />
</p>

---

### Tools

Inspect tool usage behavior across your Claude Code sessions:

- Top tools by usage volume
- Success rate by tool
- Average duration by tool
- Code edit decisions (accept/reject) with language breakdown
- Tool timeline trends across the selected period

<p align="center">
  <img src="docs/images/tools.jpg" width="800" alt="Tools analytics view" />
</p>

---

### Performance

Usage insights derived directly from local telemetry:

- Cache hit rate trends
- Cost efficiency over time
- Peak coding hours
- Error rate and session length distribution
- Token usage by model

<p align="center">
  <img src="docs/images/performance.jpg" width="800" alt="Performance analytics view" />
</p>

---

### Usage

Monitor your Claude Pro/Max subscription usage in real time:

- Session limit (5-hour window) and weekly limits
- Per-model breakdown (Opus, Sonnet)
- Extra usage spend tracking
- Data fetched from Anthropic's official OAuth API using your existing Claude Code credentials
- Auto-refreshes every 30 minutes to avoid rate limits

---

### Insights

Generate and view Claude Code `/insights` reports directly within Lumo:

- One-click report generation (invokes `claude /insights` CLI)
- Browse previously generated reports
- View interactive HTML reports in an embedded viewer
- Reports analyze your session patterns, friction points, and suggest CLAUDE.md improvements

---

### Skills & Marketplace

Manage Claude Code skills and plugins:

- Browse, install, and uninstall skills
- View skill details and configuration
- Browse the plugin marketplace
- Install community plugins

---

### Claude Code Wrapped

A lightweight "wrapped" summary for your Claude Code habits:

- Period switcher (Today / This Week / This Month / All Time)
- Total collaboration hours
- Session count and average session duration
- Go-to model and favorite tool
- Token breakdown and cost snapshot
- Longest streak and peak hour highlights
- Copy / save share card image

<p align="center">
  <img src="docs/images/claude-code-wrapped.png" width="420" alt="Claude Code Wrapped summary card" />
</p>

---

## How It Works

```
Claude Code ── OTLP logs/metrics + hooks ──▶ Lumo Daemon ──▶ SQLite ──▶ Desktop App
                                            (port 4318)     (~/.lumo)
```

1. **Lumo Daemon**
   A lightweight background service that receives Claude Code telemetry
   (`/v1/logs`, `/v1/metrics`) and hook notifications (`/notify`),
   then writes them to a local SQLite database.

2. **Desktop App**
   A native desktop application (built with Tauri) that reads from
   the same database and renders dashboards and session views.

3. **Local Integration Helpers**
   On app startup, Lumo attempts to:
   - ensure the daemon is installed/running
   - update `~/.claude/settings.json` for OTEL export + hooks
   - poll stored hook notifications and send OS notifications

The telemetry pipeline and database are local-first.

---

## Privacy & Data

- No sign-in required
- No cloud services
- No third-party analytics
- No data leaves your machine

All data is stored locally at:

```
~/.lumo
```

You can inspect or delete it at any time.

---

## Installing Lumo

### Option 1: Download a release build (recommended)

1. Open the latest release: <https://github.com/zhnd/lumo/releases/latest>
2. Download the package for your platform
3. Install and launch `lumo`

On macOS, Lumo will install/manage the bundled `lumo-daemon` under `~/.lumo/bin`
and register a `launchd` agent on first launch.

### Option 2: Run from source

Use this if you want to develop or modify Lumo locally.

---

## Developing from Source

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 24.12 | Frontend runtime |
| pnpm | >= 10.26 | Package manager |
| Rust (stable) | >= 1.77.2 | Backend + daemon |
| typeshare-cli | latest | Rust → TypeScript type generation (`cargo install typeshare-cli`) |
| [Tauri v2 deps](https://v2.tauri.app/start/prerequisites/) | — | Platform-specific build dependencies |

### First-time Setup

```bash
git clone https://github.com/zhnd/lumo.git
cd lumo
pnpm install

# Build the daemon (required before first launch)
cargo build -p lumo-daemon

# Start the app
pnpm tauri:dev
```

> **Important**: `pnpm tauri:dev` does NOT automatically compile the daemon. You must run `cargo build -p lumo-daemon` before the first launch, and again whenever you modify code under `crates/daemon/` or `crates/shared/`.

On startup, the app will configure Claude Code OTEL/hook settings in `~/.claude/settings.json` automatically.

See [QUICKSTART.md](QUICKSTART.md) for a more detailed development guide.

---

## macOS Installation Troubleshooting

### Error: "`lumo` is damaged and can't be opened. You should move it to the Trash."

This is usually caused by macOS Gatekeeper/quarantine checks on unsigned or newly-downloaded apps, not necessarily because the app is actually broken.

Use one of the following methods after confirming you downloaded Lumo from the official GitHub Releases page:

### Method 1: Open from System Settings (safest GUI method)

1. Try opening `lumo` once (let it fail)
2. Open `System Settings` → `Privacy & Security`
3. Find the blocked app message near the bottom
4. Click `Open Anyway`, then confirm

### Method 2: Remove quarantine attribute (Terminal)

If the app is in `/Applications`:

```bash
xattr -dr com.apple.quarantine "/Applications/lumo.app"
```

If you run it from `Downloads`, replace the path accordingly.

Then try launching the app again.

> Note: Do not disable Gatekeeper globally. Only remove quarantine for apps you trust.

---

## Tech Stack

| Layer | Technology |
|------|------------|
| Desktop shell | Tauri v2 (Rust) |
| Telemetry receiver | Axum + OpenTelemetry |
| Claude Code integration | `~/.claude/settings.json` (OTEL + hooks) |
| Database | SQLite (SQLx) |
| Frontend | Next.js 16, React 19 |
| State & data | TanStack Query |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | ECharts + Recharts |
| Type sharing | Typeshare (Rust → TypeScript) |

---

## Project Structure

```
lumo/
├── crates/daemon/      # OTLP receiver service (Axum HTTP)
├── crates/shared/      # Database entities, repositories, migrations
├── src-tauri/          # Tauri backend (commands, services, types)
└── packages/ui/        # Desktop UI (Next.js SSG)
    ├── app/            # Routes
    └── src/
        ├── modules/    # Page modules (Overview, Sessions, Tools, Performance,
        │               #   Usage, Insights, Skills, Marketplace, Wrapped)
        ├── bridges/    # Tauri IPC wrappers
        └── components/ # Shared UI components
```

---

## License

MIT
