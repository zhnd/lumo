# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **pnpm** exclusively. Always use `pnpm` / `pnpm dlx` instead of `npm` / `npx`.

## Project Overview

Lumo is a local-first desktop application for monitoring Claude Code usage. It collects telemetry data via OpenTelemetry Protocol (OTLP) and hook events, then displays usage analytics in a native desktop UI.

**Key characteristics:**
- No accounts, no cloud services, no data leaves your machine
- All data stored locally in SQLite at `~/.lumo/`
- Daemon auto-installed and managed by the desktop app on macOS

### Components

1. **Daemon** (`crates/daemon/`): Standalone HTTP service (Axum) that receives OTLP metrics/logs and hook notifications from Claude Code
2. **Shared Library** (`crates/shared/`): Common database layer (entities, repositories, migrations) used by both daemon and Tauri app
3. **Tauri App** (`src-tauri/`): Desktop application shell with native OS integration, IPC commands, and business services
4. **Frontend** (`packages/ui/`): React-based UI (pnpm workspace package `@lumo/ui`)

## Module Documentation

Each module has its own CLAUDE.md with detailed patterns and guidelines:

- [`crates/daemon/CLAUDE.md`](crates/daemon/CLAUDE.md) - Daemon service architecture
- [`crates/shared/CLAUDE.md`](crates/shared/CLAUDE.md) - Database layer and entity patterns
- [`src-tauri/CLAUDE.md`](src-tauri/CLAUDE.md) - Tauri backend, services, and IPC commands
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) - Frontend architecture and component patterns

## Architecture

### System Overview

```
Claude Code
  |
  |-- OTLP logs/metrics (HTTP JSON) --> Lumo Daemon (port 4318) --> SQLite (~/.lumo/lumo.db)
  |-- Hook events (/notify endpoint) ----^                              |
                                                                        v
                                                              Tauri App (reads DB)
                                                                        |
                                                                        v
                                                              React UI (Next.js SSG)
```

### Data Flow

1. **Claude Code** emits OTLP telemetry and hook events
2. **Lumo Daemon** receives them via HTTP endpoints and persists to SQLite
3. **Tauri App** reads from the same SQLite database and serves data to the frontend via IPC
4. **React UI** displays dashboards, session history, tool analytics, and usage insights

### On App Startup

The Tauri app automatically:
1. Initializes the SQLite database and runs migrations
2. Ensures the daemon is installed and running (macOS: `launchd` agent)
3. Configures `~/.claude/settings.json` for OTLP export and hooks
4. Starts background session file watcher and notification poller

### Rust Crates

1. **Daemon** (`crates/daemon/`): OTLP telemetry receiver
   - Standalone HTTP service using Axum
   - Endpoints: `/health`, `/v1/metrics`, `/v1/logs`, `/notify`
   - Persists data to SQLite via shared library
   - Runs independently of Tauri app

2. **Shared Library** (`crates/shared/`): Common database layer
   - Entity definitions with Row/Domain type split
   - Repository pattern for data access (events, metrics, sessions, notifications)
   - Migrations and connection management
   - Used by both daemon and Tauri app

3. **Tauri Backend** (`src-tauri/`): Desktop application shell
   - **Commands** (`commands/`): IPC handlers for frontend communication
   - **Services** (`services/`): Business logic (analytics, trends, tools, usage, wrapped, etc.)
   - **Types** (`types/`): Response types with `#[typeshare]` for TypeScript generation
   - **Daemon** (`daemon/`): Daemon lifecycle management (install, health check, launchd plist)
   - Plugins: log, clipboard, dialog, updater, process, notification, window-state

### Frontend Package

**UI** (`packages/ui/`): Next.js 16 with App Router (SSG mode)
- Pages: Overview, Sessions, Session Detail, Tools, Analytics, Usage, Wrapped
- TanStack Query + Tauri IPC for data fetching
- Tailwind CSS v4 + shadcn/ui components
- ECharts for charts and visualizations

### Full-Stack Data Pipeline

```
Migration (SQL) --> Entity (Row + Domain) --> Repository --> Service --> Command --> Bridge --> useService hook --> UI
```

1. **Migrations** (`crates/shared/migrations/`): SQL schema versioning
2. **Entities** (`crates/shared/src/database/entities/`): `*Row` (FromRow) + Domain (Serialize) + `New*` (insertion)
3. **Repositories** (`crates/shared/src/database/repositories/`): Static methods with `&SqlitePool`
4. **Services** (`src-tauri/src/services/`): Business logic, aggregation, calculations
5. **Commands** (`src-tauri/src/commands/`): `#[command]` IPC handlers
6. **Types** (`src-tauri/src/types/`): Response types with `#[typeshare]` annotation
7. **Bridges** (`packages/ui/src/bridges/`): TypeScript classes wrapping `invoke()` calls
8. **Hooks** (`packages/ui/src/modules/*/use-service.ts`): TanStack Query integration
9. **UI** (`packages/ui/src/modules/*/index.tsx`): Pure rendering components

---

## Prerequisites

- **Node.js** >= 24.12
- **pnpm** >= 10.26
- **Rust** (stable, >= 1.77.2)
- **Platform dependencies** for [Tauri v2](https://v2.tauri.app/start/prerequisites/)

## Development Commands

### Full Stack Development
```bash
pnpm tauri:dev    # Start Tauri app with frontend dev server (recommended)
pnpm tauri build  # Build production Tauri application bundle
```

### Frontend Only
```bash
pnpm dev          # Start Next.js dev server on localhost:3000
pnpm build        # Build Next.js static export to packages/ui/out/
pnpm lint         # Run ESLint
```

### Daemon Only
```bash
cargo run -p lumo-daemon              # Run daemon in development
RUST_LOG=debug cargo run -p lumo-daemon  # Run with debug logging
```

### Rust Checks
```bash
cargo check                   # Check all crates
cargo check -p app            # Check Tauri app (note: package name is "app", not "lumo-app")
cargo check -p lumo-daemon    # Check daemon
cargo check -p shared         # Check shared library
```

### Type Generation
```bash
pnpm generate-types  # Generate TypeScript types from Rust #[typeshare] structs
```

Note: `pnpm tauri:dev` automatically runs type generation before starting.

---

## Build Flow

1. **Frontend Build**: Next.js builds a static site to `packages/ui/out/`
2. **Daemon Build**: `cargo build -p lumo-daemon --release` (triggered by `beforeBuildCommand`)
3. **Tauri Bundle**: Packages static frontend + daemon binary + Rust backend into native executable

Key configuration:
- `packages/ui/next.config.ts`: `output: 'export'` for SSG
- `src-tauri/tauri.conf.json`: `frontendDist` points to `../packages/ui/out`
- `src-tauri/tauri.conf.json`: `resources` bundles the daemon binary

---

## File Structure

```
lumo/
├── packages/
│   └── ui/                        # Next.js frontend (@lumo/ui)
│       ├── app/                   # Next.js App Router (route definitions only)
│       │   ├── page.tsx           # Overview
│       │   ├── sessions/          # Sessions list + detail
│       │   ├── tools/             # Tool analytics
│       │   ├── analytics/         # Performance analytics
│       │   ├── usage/             # Subscription usage
│       │   └── wrapped/           # Claude Code Wrapped
│       └── src/
│           ├── bridges/           # Tauri IPC wrappers
│           ├── components/        # Shared React components
│           │   └── ui/            # shadcn/ui (READ-ONLY)
│           ├── generated/         # Auto-generated TypeScript types
│           ├── hooks/             # Global React hooks
│           ├── lib/               # Utilities (query-client, format, utils)
│           └── modules/           # Page-level business logic
│               ├── overview/      # / route
│               ├── sessions/      # /sessions route
│               ├── session-detail/ # /sessions/detail route
│               ├── tools/         # /tools route
│               ├── analytics/     # /analytics route (not yet listed)
│               ├── usage/         # /usage route
│               └── wrapped/       # /wrapped route
├── crates/
│   ├── daemon/                    # OTLP receiver service
│   │   └── src/
│   │       ├── handlers/          # Request handlers
│   │       ├── routes/            # Route definitions
│   │       ├── services/          # OTLP parsing
│   │       └── server/            # App state, shutdown
│   └── shared/                    # Shared database library
│       ├── src/database/
│       │   ├── entities/          # event, metric, session, notification
│       │   └── repositories/      # event_repo, metric_repo, session_repo, notification_repo
│       └── migrations/            # SQL migration files
├── src-tauri/                     # Tauri desktop app
│   └── src/
│       ├── commands/              # IPC handlers (13 modules)
│       ├── services/              # Business logic (10 services)
│       ├── types/                 # Response types with #[typeshare] (8 modules)
│       ├── daemon/                # Daemon lifecycle management
│       ├── database/              # DB setup (delegates to shared)
│       └── lib.rs                 # App setup, plugin registration
├── scripts/                       # Build & install scripts
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml            # pnpm workspace config
├── Cargo.toml                     # Cargo workspace config
└── package.json                   # Root scripts
```

---

## Adding a New Feature (End-to-End)

### 1. Database Migration
Create SQL file in `crates/shared/migrations/` with timestamp prefix:
```sql
-- crates/shared/migrations/YYYYMMDDHHMMSS_description.sql
CREATE TABLE IF NOT EXISTS my_table (...);
```

### 2. Entity + Repository (shared crate)
- Define `MyEntityRow` (FromRow), `MyEntity` (Serialize), `NewMyEntity` in `crates/shared/src/database/entities/`
- Create repository with static async methods in `crates/shared/src/database/repositories/`
- Export in respective `mod.rs` files

### 3. Types (Tauri)
- Define response types in `src-tauri/src/types/` with `#[typeshare]` annotation
- Note: `typeshare` does NOT support `i64` - use `f64` for large numbers

### 4. Service (Tauri)
- Add business logic in `src-tauri/src/services/`
- Register in `src-tauri/src/services/mod.rs`

### 5. Commands (Tauri)
- Add `#[command]` handlers in `src-tauri/src/commands/`
- Register in `app_commands!` macro in `src-tauri/src/commands/mod.rs`

### 6. Generate TypeScript Types
```bash
pnpm generate-types
```

### 7. Bridge (Frontend)
- Create `packages/ui/src/bridges/my-bridge.ts` wrapping `invoke()` calls

### 8. Module (Frontend)
- Create module in `packages/ui/src/modules/my-module/`
  - `index.tsx` - UI rendering only
  - `use-service.ts` - TanStack Query hooks + state
  - `types.ts` - TypeScript types
- Create route in `packages/ui/app/my-route/page.tsx`
- Add sidebar entry in `packages/ui/src/components/app-sidebar/constants.ts`

---

## Key Conventions

| Area | Convention |
|------|-----------|
| Package manager | pnpm only |
| Rust package names | `app` (Tauri), `lumo-daemon`, `shared` |
| Entity pattern | Row (FromRow) -> Domain (Serialize) -> New (insert) |
| Repository pattern | Static async methods taking `&SqlitePool` |
| Command pattern | `#[command] pub async fn` returning `Result<T, String>` |
| Typeshare location | `src-tauri/src/types/` (NOT in shared crate) |
| Frontend components | Must be folders with `index.tsx` + `use-service.ts` |
| UI/logic separation | `index.tsx` = JSX only, `use-service.ts` = all hooks/state |
| Styling | Tailwind CSS only, theme tokens (no hardcoded grays) |
| shadcn/ui | `components/ui/` is READ-ONLY |
| Icons | lucide-react with `size-4` convention |

See individual module CLAUDE.md files for detailed patterns.
