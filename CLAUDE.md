# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumo is a hybrid desktop application built with Tauri (Rust backend) and Next.js (React frontend). The architecture combines a Rust-based desktop application shell with a statically-exported Next.js web interface.

## Architecture

### Dual Runtime Model

This project uses a unique dual-runtime architecture:

1. **Tauri Backend** (`src-tauri/`): Rust-based native desktop shell
   - Provides native OS integration and desktop window management
   - Handles system-level operations and security boundaries
   - Entry point: `src-tauri/src/main.rs` calls `app_lib::run()` from `lib.rs`
   - Logging enabled in debug mode via `tauri-plugin-log`
   - Database layer using SQLx with SQLite
   - Async operations powered by Tokio runtime

2. **Next.js Frontend** (root directory): React-based UI
   - Configured for Static Site Generation (SSG) with `output: 'export'`
   - Uses App Router (files in `app/` directory)
   - Builds to `out/` directory which Tauri serves as `frontendDist`
   - TypeScript path alias: `@/*` maps to project root
   - Communicates with backend via Tauri IPC through Bridge pattern

### Database Layer Architecture

The database layer follows a clean, layered pattern inspired by query-box:

1. **Entities** (`src-tauri/src/database/entities/`): Data models
   - `*Row` structs map to database tables (with `#[derive(FromRow)]`)
   - Domain models with `#[typeshare]` for TypeScript generation
   - `TryFrom<Row>` conversions handle parsing and validation

2. **Repositories** (`src-tauri/src/database/repositories/`): Data access layer
   - Encapsulate all SQL queries using SQLx
   - Async methods returning `Result<T, anyhow::Error>`
   - Use `QueryBuilder` for dynamic updates

3. **Commands** (`src-tauri/src/commands/`): Tauri IPC handlers
   - Expose repository methods to frontend via `#[command]` macro
   - Access `SqlitePool` from app state
   - Return `Result<T, String>` for serialization

4. **Bridges** (`src/bridges/`): Frontend API wrappers
   - TypeScript classes wrapping `invoke()` calls
   - Type-safe interfaces using generated types
   - Centralize all IPC communication

5. **Migrations** (`src-tauri/migrations/`): Schema versioning
   - SQL files with timestamp prefixes
   - Executed automatically on startup via `sqlx::migrate!()`

### Build Flow

The build process has two distinct phases:

1. **Frontend Build**: Next.js builds a static site to `out/`
2. **Tauri Bundle**: Packages the static frontend with Rust backend into native executable

Key configuration:
- `next.config.ts`: Sets `output: 'export'` for SSG, configures `assetPrefix` for dev/prod
- `src-tauri/tauri.conf.json`: Points to `out/` as `frontendDist`, runs Next.js dev server at `localhost:3000`
- Next.js Image component requires `unoptimized: true` due to SSG constraints

## Development Commands

### Frontend Development
```bash
pnpm dev          # Start Next.js dev server on localhost:3000
pnpm build        # Build Next.js static export to out/
pnpm lint         # Run ESLint
```

### Tauri Development
```bash
pnpm tauri:dev    # Run Tauri with type generation (recommended for full stack dev)
pnpm tauri dev    # Run Tauri in development mode (starts Next.js dev server automatically)
pnpm tauri build  # Build production Tauri application bundle
```

### Database & Type Generation
```bash
pnpm generate-types  # Generate TypeScript types from Rust structs using typeshare
```

Note: `pnpm tauri:dev` automatically runs type generation before starting.

### Integrated Development
When running `pnpm tauri dev`:
- Tauri executes `beforeDevCommand` which runs `pnpm dev`
- Next.js dev server starts on `localhost:3000`
- Tauri window loads from the dev server with hot reload
- Asset prefix is set to `http://localhost:3000` (or TAURI_DEV_HOST if set)

When running `pnpm tauri build`:
- Tauri executes `beforeBuildCommand` which runs `pnpm build`
- Next.js exports static files to `out/`
- Tauri bundles the static files with the Rust binary

## Technology Stack

- **Frontend**: Next.js 16.1.4, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Tauri 2.9.5, Rust (edition 2021, min version 1.77.2)
- **Database**: SQLite with SQLx 0.8.3 (async SQL library)
- **Runtime**: Tokio 1.44.0 (async runtime for Rust)
- **Type Generation**: Typeshare 1.0.3 (Rust → TypeScript type sync)
- **Package Manager**: pnpm (workspace configuration in `pnpm-workspace.yaml`)
- **Styling**: Tailwind v4 with PostCSS, Geist font family (sans & mono)

## Key Constraints

1. **SSG-Only Mode**: Next.js is configured for static export, so SSR/ISR features are unavailable
2. **Image Optimization**: Next.js Image component requires `unoptimized: true`
3. **Dual Commands**: Always use `pnpm tauri dev` for full app development, not just `pnpm dev`
4. **Asset Paths**: Development uses absolute URLs to localhost:3000, production uses relative paths

## File Structure

- `app/`: Next.js App Router pages and layouts
- `src/`: Frontend source code
  - `bridges/`: Tauri IPC wrappers (e.g., `user-bridge.ts`)
  - `hooks/`: React custom hooks (e.g., `useUsers.ts`)
  - `generated/`: Auto-generated TypeScript types from Rust
- `src-tauri/`: Rust source code and Tauri configuration
  - `src/lib.rs`: Main Tauri application setup with database initialization
  - `src/main.rs`: Entry point with Tokio runtime
  - `src/commands/`: Tauri command handlers (IPC layer)
  - `src/database/`: Database layer
    - `connection.rs`: SQLite pool setup and migrations
    - `entities/`: Data models (Row structs + domain models)
    - `repositories/`: Data access layer (CRUD operations)
  - `migrations/`: SQL migration files (timestamped)
  - `tauri.conf.json`: Tauri configuration (window size, bundle settings)
  - `typeshare.toml`: Type generation configuration
  - `Cargo.toml`: Rust dependencies
- `scripts/`: Build and generation scripts
  - `generate-types.js`: Runs typeshare for type generation
- `public/`: Static assets served by Next.js
- `out/`: Generated static build (gitignored, created by `next build`)

## Working with the Database

See `DATABASE.md` for comprehensive guide on:
- Database architecture and patterns
- Creating new tables and entities
- Writing repositories and commands
- Frontend integration with bridges and hooks
- Migration management

Quick pattern for adding a new feature:
1. Create migration in `src-tauri/migrations/`
2. Define entity in `src-tauri/src/database/entities/`
3. Create repository in `src-tauri/src/database/repositories/`
4. Add commands in `src-tauri/src/commands/`
5. Register commands in `app_commands!` macro
6. Run `pnpm generate-types` to sync types
7. Create bridge in `src/bridges/`
8. Create hook in `src/hooks/` (optional)
