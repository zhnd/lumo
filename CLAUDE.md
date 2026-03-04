# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **pnpm** exclusively. Always use `pnpm` / `pnpm dlx` instead of `npm` / `npx`.

## Project Overview

Lumo is a Claude Code usage monitoring application that collects telemetry data via OpenTelemetry Protocol (OTLP) and displays it in a desktop overview. The architecture consists of:

1. **Daemon** (`crates/daemon/`): OTLP receiver service that collects metrics/events from Claude Code
2. **Tauri App** (`src-tauri/`): Desktop application shell with native OS integration
3. **Frontend** (`packages/ui/`): React-based overview UI (pnpm workspace package `@lumo/ui`)
4. **Shared Library** (`crates/shared/`): Common database layer used by daemon and Tauri app

## Module Documentation

Each module has its own CLAUDE.md with detailed patterns and guidelines:

- [`crates/daemon/CLAUDE.md`](crates/daemon/CLAUDE.md) - Daemon service architecture
- [`crates/shared/CLAUDE.md`](crates/shared/CLAUDE.md) - Database layer and entity patterns
- [`src-tauri/CLAUDE.md`](src-tauri/CLAUDE.md) - Tauri backend and IPC commands
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) - Frontend architecture and component patterns

## Architecture

### System Overview

```
Claude Code (with OTLP exporter)
        │
        ▼ OTLP/HTTP (JSON)
┌───────────────────┐
│  lumo-daemon      │ ← Standalone service on port 4318
│  (crates/daemon)  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  SQLite Database  │ ← ~/.lumo/lumo.db
│  (lumo-shared)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Tauri App        │ ← Desktop application
│  (src-tauri)      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  React Overview  │ ← Next.js frontend
│  (packages/ui)    │
└───────────────────┘
```

### Rust Crates

1. **Daemon** (`crates/daemon/`): OTLP telemetry receiver
   - Standalone HTTP service using Axum
   - Receives metrics/logs from Claude Code via OTLP protocol
   - Persists data to SQLite via shared library
   - Runs independently of Tauri app

2. **Shared Library** (`crates/shared/`): Common database layer
   - Entity definitions with Row/Domain type split
   - Repository pattern for data access
   - Migrations and connection management
   - Used by both daemon and Tauri app

3. **Tauri Backend** (`src-tauri/`): Desktop application shell
   - Native OS integration and window management
   - IPC commands for frontend communication
   - Reads telemetry data from shared database
   - Async operations powered by Tokio runtime

### Frontend Package

**UI** (`packages/ui/`): Next.js overview
- Next.js 16 with App Router (SSG mode)
- TanStack Query + Tauri IPC for data fetching
- Tailwind CSS v4 + shadcn/ui components
- See [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) for detailed patterns

### Database Layer Architecture

The database layer follows a clean, layered pattern:

1. **Entities** (`crates/shared/src/database/entities/`): Data models
   - `*Row` structs map to database tables (with `#[derive(FromRow)]`)
   - Domain models with `#[typeshare]` for TypeScript generation
   - `TryFrom<Row>` conversions handle parsing and validation

2. **Repositories** (`crates/shared/src/database/repositories/`): Data access layer
   - Encapsulate all SQL queries using SQLx
   - Async methods returning `Result<T, anyhow::Error>`
   - Use `QueryBuilder` for dynamic updates

3. **Commands** (`src-tauri/src/commands/`): Tauri IPC handlers
   - Expose repository methods to frontend via `#[command]` macro
   - Access `SqlitePool` from app state
   - Return `Result<T, String>` for serialization

4. **Bridges** (`packages/ui/src/bridges/`): Frontend API wrappers
   - TypeScript classes wrapping `invoke()` calls
   - Type-safe interfaces using generated types
   - Centralize all IPC communication

5. **Migrations** (`crates/shared/migrations/`): Schema versioning
   - SQL files with timestamp prefixes
   - Executed automatically on startup via `sqlx::migrate!()`

---

## Development Commands

### Full Stack Development
```bash
pnpm tauri:dev    # Run Tauri with type generation (recommended)
pnpm tauri dev    # Run Tauri in development mode
pnpm tauri build  # Build production Tauri application bundle
```

### Frontend Only
```bash
pnpm dev          # Start Next.js dev server on localhost:3000
pnpm build        # Build Next.js static export
pnpm lint         # Run ESLint
```

### Daemon Development
```bash
cargo run -p lumo-daemon              # Run daemon in development
RUST_LOG=debug cargo run -p lumo-daemon  # Run with debug logging
cargo build -p lumo-daemon --release  # Build release binary
```

### Type Generation
```bash
pnpm generate-types  # Generate TypeScript types from Rust structs
```

Note: `pnpm tauri:dev` automatically runs type generation before starting.

---

## Build Flow

The build process has two distinct phases:

1. **Frontend Build**: Next.js builds a static site to `packages/ui/out/`
2. **Tauri Bundle**: Packages the static frontend with Rust backend into native executable

Key configuration:
- `packages/ui/next.config.ts`: Sets `output: 'export'` for SSG
- `src-tauri/tauri.conf.json`: Points to `../packages/ui/out` as `frontendDist`

---

## File Structure

```
lumo/
├── packages/                  # pnpm workspace packages
│   └── ui/                    # Next.js frontend (@lumo/ui)
│       ├── app/               # Next.js App Router
│       ├── components/        # React components
│       ├── src/               # Frontend source (bridges, hooks, types)
│       ├── scripts/           # UI build scripts
│       └── CLAUDE.md          # Frontend module docs
├── crates/                    # Cargo workspace crates
│   ├── daemon/                # OTLP receiver service
│   │   ├── src/               # Daemon source code
│   │   └── CLAUDE.md          # Daemon module docs
│   └── shared/                # Shared database library
│       ├── src/database/      # Entities and repositories
│       ├── migrations/        # SQL migrations
│       └── CLAUDE.md          # Shared module docs
├── src-tauri/                 # Tauri desktop app
│   ├── src/                   # Tauri backend source
│   ├── tauri.conf.json        # Tauri configuration
│   └── CLAUDE.md              # Tauri module docs
├── scripts/                   # Build scripts
│   ├── install-daemon.sh      # Daemon installation
│   └── uninstall-daemon.sh    # Daemon removal
├── pnpm-workspace.yaml        # pnpm workspace config
├── Cargo.toml                 # Cargo workspace config
└── package.json               # Root package.json (scripts)
```

---

## Working with the Database

Quick pattern for adding a new feature:

1. Create migration in `crates/shared/migrations/`
2. Define entity in `crates/shared/src/database/entities/`
3. Create repository in `crates/shared/src/database/repositories/`
4. Add commands in `src-tauri/src/commands/`
5. Register commands in `app_commands!` macro
6. Run `pnpm generate-types` to sync types
7. Create bridge in `packages/ui/src/bridges/`
8. Create hook in `packages/ui/src/hooks/` (optional)

See individual module CLAUDE.md files for detailed patterns.
