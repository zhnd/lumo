# Daemon Module

The daemon is a standalone Rust HTTP service that receives OpenTelemetry Protocol (OTLP) telemetry data and hook notifications from Claude Code, then persists them to SQLite.

## Architecture

The daemon follows a layered architecture pattern:

```
Routes --> Handlers --> Services --> Repositories --> SQLite
```

### Layer Responsibilities

1. **Routes** (`src/routes/`): Define HTTP endpoints and route configuration
2. **Handlers** (`src/handlers/`): Extract request data, call services, return responses
3. **Services** (`src/services/`): Business logic and data transformation (OTLP parsing)
4. **Repositories**: Data access layer (from `lumo-shared` crate)

## Directory Structure

```
src/
├── main.rs              # Entry point with Tokio runtime
├── config.rs            # Environment-based configuration
├── server/
│   ├── mod.rs
│   ├── app.rs           # Axum router setup
│   ├── state.rs         # AppState (SqlitePool + Config)
│   └── shutdown.rs      # Graceful shutdown handling
├── routes/
│   ├── mod.rs
│   ├── health.rs        # GET /health
│   ├── otlp.rs          # POST /v1/metrics, POST /v1/logs
│   └── notify.rs        # POST /notify (hook notifications)
├── handlers/
│   ├── mod.rs
│   ├── health.rs        # Health check handler
│   ├── metrics.rs       # OTLP metrics handler
│   ├── logs.rs          # OTLP logs handler
│   └── notify.rs        # Hook notification handler
└── services/
    ├── mod.rs
    └── otlp_parser.rs   # OTLP protocol parsing
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with version info |
| POST | `/v1/metrics` | Receive OTLP metrics (protobuf JSON) |
| POST | `/v1/logs` | Receive OTLP logs/events (protobuf JSON) |
| POST | `/notify` | Receive Claude Code hook notifications |

## Adding a New Endpoint

### 1. Create route in `src/routes/`

```rust
// src/routes/my_route.rs
use axum::Router;
use crate::server::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/my-endpoint", get(crate::handlers::my_handler::handle))
}
```

### 2. Create handler in `src/handlers/`

```rust
// src/handlers/my_handler.rs
use axum::extract::State;
use crate::server::AppState;

pub async fn handle(
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Access database: state.pool
    // Access config: state.config
    Json(json!({ "status": "ok" }))
}
```

### 3. Register route in `src/server/app.rs`

```rust
pub fn create_app(state: AppState) -> Router {
    Router::new()
        .merge(health::router())
        .merge(otlp::router())
        .merge(notify::router())
        .merge(my_route::router())  // Add here
        .with_state(state)
}
```

## State Management

```rust
pub struct AppState {
    pub pool: SqlitePool,    // Database connection pool
    pub config: Arc<Config>, // Immutable configuration
}
```

## Configuration

Environment variables:
- `LUMO_HOST`: Bind address (default: `127.0.0.1`)
- `LUMO_PORT`: Port number (default: `4318`)
- `RUST_LOG`: Log level (default: `info`)

## Daemon Lifecycle

The daemon is managed by the Tauri app via `DaemonManager` (`src-tauri/src/daemon/`):
- Binary bundled as a resource in the Tauri app
- Installed to `~/.lumo/bin/lumo-daemon` on first launch
- Registered as a macOS `launchd` agent (`com.zhnd.lumo-daemon`)
- Health-checked via `GET /health` before each app startup

## Development Commands

```bash
cargo run -p lumo-daemon                    # Run daemon in development
RUST_LOG=debug cargo run -p lumo-daemon     # Run with debug logging
cargo build -p lumo-daemon --release        # Build release binary
```

## Dependencies

Key dependencies:
- `axum`: HTTP framework
- `tokio`: Async runtime
- `sqlx`: Database access (via lumo-shared)
- `opentelemetry-proto`: OTLP protocol types
- `tracing`: Structured logging
