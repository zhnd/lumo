# Tauri Backend Module

The Tauri backend provides the desktop application shell with native OS integration, IPC command handlers, business services, and daemon lifecycle management.

## Architecture

The Tauri app follows a layered architecture:

```
Frontend (React) --> invoke() --> Commands --> Services --> Repositories --> SQLite
                                                 |
                                          Types (typeshare)
```

### Layer Responsibilities

1. **Commands** (`src/commands/`): IPC handlers exposed to frontend via `#[command]`
2. **Services** (`src/services/`): Business logic, data aggregation, calculations
3. **Types** (`src/types/`): Response types with `#[typeshare]` for TypeScript generation
4. **Daemon** (`src/daemon/`): Daemon binary lifecycle (install, health, launchd)
5. **Database** (`src/database/`): DB setup (delegates to shared crate)

## Directory Structure

```
src/
├── main.rs                  # Entry point with Tokio runtime
├── lib.rs                   # App setup, plugin registration, startup sequence
├── commands/
│   ├── mod.rs               # app_commands! macro with all registered commands
│   ├── analytics_commands.rs
│   ├── claude_session_commands.rs
│   ├── daemon_commands.rs
│   ├── export_commands.rs
│   ├── session_commands.rs
│   ├── stats_commands.rs
│   ├── subscription_usage_commands.rs
│   ├── system_commands.rs
│   ├── tools_commands.rs
│   ├── trends_commands.rs
│   ├── usage_commands.rs
│   ├── user_commands.rs
│   └── wrapped_commands.rs
├── services/
│   ├── mod.rs
│   ├── analytics_service.rs    # Hourly activity, session distribution, cache hit, heatmap
│   ├── claude_config_service.rs # Auto-configure ~/.claude/settings.json
│   ├── claude_session_service.rs # Read Claude session JSONL files from disk
│   ├── config_service.rs       # App configuration (API keys, paths)
│   ├── notification_poller.rs  # Background poller for OS notifications
│   ├── session_cache.rs        # In-memory LRU cache for session details
│   ├── session_watcher.rs      # File watcher for Claude session changes
│   ├── stats_service.rs        # Summary stats, model stats, token stats
│   ├── subscription_usage_service.rs # Claude Pro/Max usage scraping via hidden webview
│   ├── time_range.rs           # Time range helpers (today/week/month)
│   ├── tools_service.rs        # Tool usage stats, code edit decisions
│   ├── trends_service.rs       # Usage trends, cost by model, cost efficiency
│   ├── usage_service.rs        # API usage limits via Anthropic API
│   └── wrapped_service.rs      # "Wrapped" summary data aggregation
├── types/
│   ├── mod.rs
│   ├── analytics.rs            # Analytics response types
│   ├── claude_session.rs       # Session detail types
│   ├── entities.rs             # Re-exported entity types
│   ├── stats.rs                # Summary/model/token stats types
│   ├── subscription_usage.rs   # Subscription usage types
│   ├── tools.rs                # Tool usage types
│   ├── trends.rs               # Trends response types
│   ├── usage.rs                # API usage types
│   └── wrapped.rs              # Wrapped data types
├── daemon/
│   ├── mod.rs
│   ├── manager.rs              # DaemonManager: install, ensure_running
│   ├── health.rs               # Health check (HTTP GET /health)
│   └── plist.rs                # macOS launchd plist generation
└── database/
    ├── mod.rs                  # setup() function
    ├── connection.rs           # Pool creation
    ├── entities/               # Local entity types (user_entity)
    └── repositories/           # Local repositories (user_repo)
```

## Command Pattern

Commands are the IPC bridge between frontend and backend:

```rust
use tauri::{command, AppHandle, Manager};
use sqlx::SqlitePool;

#[command]
pub async fn get_summary_stats(
    app_handle: AppHandle,
    time_range: String,
) -> Result<SummaryStats, String> {
    let pool = app_handle.state::<SqlitePool>();
    StatsService::get_summary_stats(&pool, &time_range)
        .await
        .map_err(|e| e.to_string())
}
```

### Command Conventions

- Always async (`pub async fn`)
- First parameter: `app_handle: AppHandle` for state access
- Return `Result<T, String>` for serialization
- Access pool via `app_handle.state::<SqlitePool>()`
- Delegate to service methods (not directly to repositories)
- Register in `app_commands!` macro in `commands/mod.rs`

## Service Pattern

Services contain business logic and should NOT hold state (except caches):

```rust
pub struct StatsService;

impl StatsService {
    pub async fn get_summary_stats(
        pool: &SqlitePool,
        time_range: &str,
    ) -> anyhow::Result<SummaryStats> {
        let range = TimeRange::parse(time_range)?;
        let sessions_count = SessionRepository::count_in_range(pool, &range).await?;
        // ... aggregate and return
    }
}
```

## Types Pattern (Typeshare)

Response types live in `src/types/` with `#[typeshare]` annotation for TypeScript generation:

```rust
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[typeshare]
pub struct SummaryStats {
    pub total_sessions: f64,    // Use f64, NOT i64 (typeshare limitation)
    pub total_cost: f64,
    pub total_tokens: f64,
}
```

**Important**: `typeshare-cli` does NOT support `i64`. Use `f64` for large numbers (timestamps, IDs, counts) in typeshare-annotated structs.

## Adding New Functionality

### 1. Define Response Types

```rust
// src/types/my_types.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[typeshare]
pub struct MyResponse { ... }
```

Export in `src/types/mod.rs`.

### 2. Create Service

```rust
// src/services/my_service.rs
pub struct MyService;
impl MyService {
    pub async fn get_data(pool: &SqlitePool, ...) -> anyhow::Result<MyResponse> { ... }
}
```

Export in `src/services/mod.rs`.

### 3. Create Commands

```rust
// src/commands/my_commands.rs
#[command]
pub async fn get_my_data(app_handle: AppHandle, ...) -> Result<MyResponse, String> {
    let pool = app_handle.state::<SqlitePool>();
    MyService::get_data(&pool, ...).await.map_err(|e| e.to_string())
}
```

### 4. Register Commands

Update `src/commands/mod.rs`:
```rust
pub mod my_commands;
pub use my_commands::*;

// Add to app_commands! macro:
commands::get_my_data,
```

### 5. Generate TypeScript Types

```bash
pnpm generate-types
```

## App Startup Sequence

Defined in `lib.rs`:

1. Register plugins (clipboard, dialog, updater, process, notification, window-state, log)
2. Initialize `SessionDetailCache` as managed state
3. In `setup()`:
   - Initialize database and run migrations
   - Ensure daemon is installed and running via `DaemonManager`
   - Configure Claude Code OTEL settings (`~/.claude/settings.json`)
   - Configure Claude Code hooks
   - Start session file watcher (background)
   - Start notification poller (background)

## Tauri Plugins

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-log` | Structured logging |
| `tauri-plugin-clipboard-manager` | Clipboard access (share card) |
| `tauri-plugin-dialog` | Native file dialogs (export) |
| `tauri-plugin-updater` | Auto-update via GitHub releases |
| `tauri-plugin-process` | Process management |
| `tauri-plugin-notification` | OS notifications |
| `tauri-plugin-window-state` | Remember window position/size |

Plugin permissions are configured in `src-tauri/capabilities/default.json`.

## Development Commands

```bash
pnpm tauri:dev          # Run Tauri with frontend dev server
pnpm tauri build        # Build production app
cargo check -p app      # Type-check Tauri crate (package name is "app")
pnpm generate-types     # Generate TypeScript types from Rust structs
```
