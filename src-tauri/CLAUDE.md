# Tauri Backend Module

The Tauri backend provides the desktop application shell with native OS integration, IPC command handlers, business services, and daemon lifecycle management.

## Architecture

```
Frontend (React) --> invoke() --> Commands --> Services --> Repositories --> SQLite
                                                 |
                                          Types (typeshare)
```

### Layers

| Directory | Responsibility |
|-----------|---------------|
| `src/commands/` | IPC handlers exposed to frontend via `#[command]` |
| `src/services/` | Business logic, data aggregation, calculations |
| `src/types/` | Response types with `#[typeshare]` for TypeScript generation |
| `src/daemon/` | Daemon binary lifecycle (install, health, launchd) |
| `src/database/` | DB setup (delegates to shared crate) |

## Command Pattern

```rust
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

### Conventions

- Always async (`pub async fn`)
- `app_handle: AppHandle` as first parameter when state access is needed
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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[typeshare]
pub struct SummaryStats {
    pub total_sessions: f64,    // Use f64, NOT i64 (typeshare limitation)
    pub total_cost: f64,
    pub total_tokens: f64,
}
```

**Important**: `typeshare-cli` does NOT support `i64`. Use `f64` for large numbers (timestamps, IDs, counts) in typeshare-annotated structs.

## Adding New Functionality

1. Define response types in `src/types/` with `#[typeshare]`, export in `mod.rs`
2. Create service in `src/services/`, export in `mod.rs`
3. Create commands in `src/commands/` with `#[command]`, export in `mod.rs`
4. Register commands in `app_commands!` macro in `commands/mod.rs`
5. Run `pnpm generate-types` to generate TypeScript types

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
