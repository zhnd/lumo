# Shared Library Module

The shared library (`lumo-shared`) provides the database layer used by both the daemon and Tauri application. It contains entities, repositories, and database connection management.

## Architecture

```
Entities (Row + Domain) --> Repositories (Static Methods) --> SQLite
```

### Key Patterns

1. **Row/Domain Type Split**: Separate types for database mapping (`*Row`) and API exposure (Domain)
2. **Static Repository Pattern**: Stateless repository methods that take `&SqlitePool`
3. **New Type Pattern**: Dedicated `New*` structs for insertions (no id field)

## Directory Structure

```
src/
├── lib.rs               # Crate root, re-exports
├── error.rs             # Error types (Error, Result)
└── database/
    ├── mod.rs           # Module exports
    ├── connection.rs    # Pool creation and migrations
    ├── entities/
    │   ├── mod.rs
    │   ├── event.rs         # EventRow, Event, NewEvent
    │   ├── metric.rs        # MetricRow, Metric, NewMetric
    │   ├── session.rs       # Session (view-based, computed from events)
    │   └── notification.rs  # NotificationRow, Notification, NewNotification
    └── repositories/
        ├── mod.rs
        ├── event_repo.rs
        ├── metric_repo.rs
        ├── session_repo.rs
        └── notification_repo.rs

migrations/
├── 20250125000001_create_tables.sql
├── 20250130000001_add_full_otlp_fields.sql
└── 20250206000001_create_notifications.sql
```

## Entity Pattern

Each entity has three types:

```rust
// 1. Row type - maps directly to database columns
#[derive(Debug, Clone, FromRow)]
pub struct EventRow {
    pub id: i64,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    // ...
}

// 2. Domain type - public API with proper types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: i64,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    // ...
}

// 3. New type - for insertions (no id field)
#[derive(Debug, Clone)]
pub struct NewEvent {
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    // ...
}

// Conversion from Row to Domain
impl From<EventRow> for Event {
    fn from(row: EventRow) -> Self {
        Self {
            id: row.id,
            session_id: row.session_id,
            // ... handle any data transformations
        }
    }
}
```

**Note**: Domain types in the shared crate use plain `Serialize`/`Deserialize`. The `#[typeshare]` annotation is only in `src-tauri/src/types/`, NOT here.

## Repository Pattern

Repositories use static async methods:

```rust
pub struct EventRepository;

impl EventRepository {
    pub async fn insert(pool: &SqlitePool, event: &NewEvent) -> Result<i64> {
        let id = sqlx::query!(
            r#"INSERT INTO events (session_id, name, timestamp) VALUES (?, ?, ?)"#,
            event.session_id, event.name, event.timestamp
        )
        .execute(pool)
        .await?
        .last_insert_rowid();
        Ok(id)
    }

    pub async fn find_by_session(pool: &SqlitePool, session_id: &str) -> Result<Vec<Event>> {
        let rows = sqlx::query_as!(
            EventRow,
            "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp DESC",
            session_id
        )
        .fetch_all(pool)
        .await?;
        Ok(rows.into_iter().map(Event::from).collect())
    }
}
```

## Adding a New Entity

### 1. Create Migration

```sql
-- migrations/YYYYMMDDHHMMSS_add_my_table.sql
CREATE TABLE IF NOT EXISTS my_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);
```

### 2. Define Entity Types

Create `src/database/entities/my_entity.rs` with Row, Domain, and New types plus `From<Row>` conversion.

### 3. Create Repository

Create `src/database/repositories/my_entity_repo.rs` with static async methods.

### 4. Export in mod.rs

```rust
// entities/mod.rs
mod my_entity;
pub use my_entity::*;

// repositories/mod.rs
mod my_entity_repo;
pub use my_entity_repo::*;
```

### 5. Generate TypeScript Types

After adding corresponding `#[typeshare]` types in `src-tauri/src/types/`:
```bash
pnpm generate-types
```

## Database Schema

### Tables

**metrics** - Aggregated OTLP metrics
- Primary metrics data from Claude Code
- Dimensions: model, tool, decision, language
- Indexed by: session_id, name, timestamp, model

**events** - OTLP log events
- Detailed event data (API requests, tool calls, prompts)
- Rich metadata: tokens, cost, duration, errors
- Indexed by: session_id, name, timestamp, tool_name, model

**notifications** - Hook event notifications
- Stored notifications from Claude Code hooks
- Used by notification poller for OS notifications

### Views

**sessions** - Aggregated session statistics
- Computed from events table
- Provides: time ranges, counts, token totals, cost totals
- Read-only, automatically updated

## Connection Management

```rust
use lumo_shared::database::{create_pool, run_migrations, get_db_path};

let db_path = get_db_path()?;          // ~/.lumo/lumo.db
let pool = create_pool(&db_path).await?;
run_migrations(&pool).await?;
```

Pool configuration:
- Max connections: 5
- WAL journal mode (better concurrent access)
- Busy timeout: 30 seconds

## Error Handling

```rust
use lumo_shared::error::{Error, Result};

pub enum Error {
    Database(sqlx::Error),
    Migration(sqlx::migrate::MigrateError),
    Serialization(serde_json::Error),
    Io(std::io::Error),
    NotFound(String),
    InvalidData(String),
}
```

## Development Commands

```bash
cargo check -p shared           # Type-check shared library
cargo sqlx prepare --workspace  # Prepare SQLx offline mode (if needed)
```
